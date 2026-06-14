// WebGL2 metaball renderer — the step that turns discrete particles into a
// continuous liquid instead of a "ballpit". Two passes:
//
//   1. Splat each particle as a soft radial blob, additively accumulated into a
//      low-res density buffer (R channel). Overlapping blobs merge into a field.
//   2. A fullscreen pass thresholds that field into an isosurface, derives a
//      surface normal from the density gradient, and shades it with a specular
//      glint, a fresnel rim, and a depth tint so it reads as wet liquid.
//
// The canvas is CSS-clipped to a circle (the orb), so no in-shader masking is
// needed. Coordinates are in canvas backing-store pixels; the sim runs in the
// same space.

import type { Particle } from "./sph";

const VERT_SPLAT = `#version 300 es
in vec2 a_pos;
in float a_kind;
uniform vec2 u_res;
uniform float u_size;
flat out float v_kind;
void main() {
  vec2 clip = (a_pos / u_res) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = u_size;
  v_kind = a_kind;
}`;

const FRAG_SPLAT = `#version 300 es
precision highp float;
flat in float v_kind;
out vec4 frag;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d) * 2.0;       // 0 at centre, 1 at sprite edge
  float w = 1.0 - r * r;
  if (w <= 0.0) discard;
  float dens = w * w;
  // HP fluid (kind 0) accumulates in R, temp-HP (kind 1) in G — two density
  // fields in one buffer so the shade pass can layer temp on top.
  frag = vec4(v_kind < 0.5 ? dens : 0.0, v_kind >= 0.5 ? dens : 0.0, 0.0, 1.0);
}`;

const VERT_QUAD = `#version 300 es
in vec2 a_quad;
out vec2 v_uv;
void main() {
  v_uv = a_quad * 0.5 + 0.5;
  gl_Position = vec4(a_quad, 0.0, 1.0);
}`;

const FRAG_SHADE = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 frag;
uniform sampler2D u_density;
uniform vec2 u_texel;
uniform vec3 u_color;    // surface tint (tier)
uniform vec3 u_deep;     // deep tint
uniform vec3 u_temp;     // temp-HP tint (cyan shimmer)
uniform float u_iso;
uniform float u_time;
float field(vec2 uv) {
  vec2 d = texture(u_density, uv).rg;
  return d.r + d.g;               // total fluid density (HP + temp)
}
void main() {
  vec2 d0 = texture(u_density, v_uv).rg;
  float c = d0.r + d0.g;
  float a = smoothstep(u_iso * 0.55, u_iso, c);
  if (a <= 0.003) { frag = vec4(0.0); return; }

  // surface normal from the total-density gradient
  float xl = field(v_uv - vec2(u_texel.x, 0.0));
  float xr = field(v_uv + vec2(u_texel.x, 0.0));
  float yd = field(v_uv - vec2(0.0, u_texel.y));
  float yu = field(v_uv + vec2(0.0, u_texel.y));
  vec2 g = vec2(xr - xl, yu - yd);
  vec3 n = normalize(vec3(g * -7.0, 1.0));

  vec3 L = normalize(vec3(-0.45, 0.65, 0.7));
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float diff = clamp(dot(n, L) * 0.5 + 0.5, 0.0, 1.0);
  float spec = pow(max(dot(n, H), 0.0), 64.0);
  float fres = pow(1.0 - clamp(n.z, 0.0, 1.0), 3.0);
  float depth = smoothstep(u_iso, u_iso * 2.6, c);

  // how much of THIS spot is the temp layer (sits on top -> high near surface)
  float tempFrac = d0.g / max(c, 1e-4);
  float tempMix = smoothstep(0.18, 0.6, tempFrac);

  vec3 base = mix(u_color, u_deep, depth) * (0.55 + 0.55 * diff);
  base = mix(base, u_temp * (0.85 + 0.4 * diff), tempMix); // cyan shield layer
  base += spec * 1.4;                       // bright wet glint
  base += fres * mix(u_color, u_temp, tempMix) * 0.9;      // luminous rim
  // a faint travelling shimmer across the temp layer
  base += tempMix * u_temp * 0.18 * (0.5 + 0.5 * sin(v_uv.x * 26.0 + u_time * 3.0));
  frag = vec4(base, a);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`shader compile failed: ${log}`);
  }
  return sh;
}

function link(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error(`program link failed: ${log}`);
  }
  return p;
}

export interface RenderOpts {
  /** surface tint, 0..1 rgb */
  color: [number, number, number];
  /** deep tint, 0..1 rgb */
  deep: [number, number, number];
  /** temp-HP tint (cyan shimmer), 0..1 rgb */
  temp: [number, number, number];
  /** point sprite diameter in backing px (≈ a few × the smoothing radius) */
  pointSize: number;
  /** seconds, for the temp-layer shimmer */
  time: number;
}

export class LiquidRenderer {
  private gl: WebGL2RenderingContext;
  private splatProg: WebGLProgram;
  private shadeProg: WebGLProgram;
  private posBuf: WebGLBuffer;
  private kindBuf: WebGLBuffer;
  private quadBuf: WebGLBuffer;
  private fbo: WebGLFramebuffer;
  private densTex: WebGLTexture;
  private posData: Float32Array = new Float32Array(0);
  private kindData: Float32Array = new Float32Array(0);
  private width = 0;
  private height = 0;
  private dw = 0; // density buffer size
  private dh = 0;
  private densityScale = 0.5;

  static isSupported(): boolean {
    try {
      const c = document.createElement("canvas");
      return !!c.getContext("webgl2");
    } catch {
      return false;
    }
  }

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { premultipliedAlpha: false, alpha: true, antialias: false });
    if (!gl) throw new Error("webgl2 unavailable");
    this.gl = gl;
    this.splatProg = link(gl, VERT_SPLAT, FRAG_SPLAT);
    this.shadeProg = link(gl, VERT_QUAD, FRAG_SHADE);
    this.posBuf = gl.createBuffer()!;
    this.kindBuf = gl.createBuffer()!;
    this.quadBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    this.fbo = gl.createFramebuffer()!;
    this.densTex = gl.createTexture()!;
  }

  resize(width: number, height: number): void {
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.dw = Math.max(1, Math.round(width * this.densityScale));
    this.dh = Math.max(1, Math.round(height * this.densityScale));
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.densTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG8, this.dw, this.dh, 0, gl.RG, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.densTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  render(particles: Particle[], opts: RenderOpts): void {
    const gl = this.gl;
    const n = particles.length;
    if (this.posData.length < n * 2) this.posData = new Float32Array(n * 2);
    if (this.kindData.length < n) this.kindData = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const p = particles[i]!;
      this.posData[i * 2] = p.x;
      this.posData[i * 2 + 1] = p.y;
      this.kindData[i] = p.kind;
    }

    // pass 1: splat density into the low-res buffer (additive; R=HP, G=temp)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.dw, this.dh);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(this.splatProg);
    gl.uniform2f(gl.getUniformLocation(this.splatProg, "u_res"), this.width, this.height);
    gl.uniform1f(gl.getUniformLocation(this.splatProg, "u_size"), opts.pointSize * this.densityScale);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.posData.subarray(0, n * 2), gl.DYNAMIC_DRAW);
    const aPos = gl.getAttribLocation(this.splatProg, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.kindBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.kindData.subarray(0, n), gl.DYNAMIC_DRAW);
    const aKind = gl.getAttribLocation(this.splatProg, "a_kind");
    gl.enableVertexAttribArray(aKind);
    gl.vertexAttribPointer(aKind, 1, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, n);

    // pass 2: shade the isosurface to the screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.shadeProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.densTex);
    gl.uniform1i(gl.getUniformLocation(this.shadeProg, "u_density"), 0);
    gl.uniform2f(gl.getUniformLocation(this.shadeProg, "u_texel"), 1 / this.dw, 1 / this.dh);
    gl.uniform3fv(gl.getUniformLocation(this.shadeProg, "u_color"), opts.color);
    gl.uniform3fv(gl.getUniformLocation(this.shadeProg, "u_deep"), opts.deep);
    gl.uniform3fv(gl.getUniformLocation(this.shadeProg, "u_temp"), opts.temp);
    gl.uniform1f(gl.getUniformLocation(this.shadeProg, "u_iso"), 0.55);
    gl.uniform1f(gl.getUniformLocation(this.shadeProg, "u_time"), opts.time);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
    const aQuad = gl.getAttribLocation(this.shadeProg, "a_quad");
    gl.enableVertexAttribArray(aQuad);
    gl.vertexAttribPointer(aQuad, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteProgram(this.splatProg);
    gl.deleteProgram(this.shadeProg);
    gl.deleteBuffer(this.posBuf);
    gl.deleteBuffer(this.kindBuf);
    gl.deleteBuffer(this.quadBuf);
    gl.deleteTexture(this.densTex);
    gl.deleteFramebuffer(this.fbo);
  }
}
