// Position-Based Fluids (Macklin & Müller, 2013) in 2D. Same SPH family as
// classic WCSPH — same poly6 density and spatial-hash neighbour search — but it
// enforces incompressibility by *projecting particle positions onto a density
// constraint* each frame instead of integrating stiff pressure forces. That
// makes it hold its volume by construction, stay stable at large timesteps (no
// CFL blow-up, no velocity clamp), and settle through real XSPH viscosity.
//
// Pure and framework-free: it owns particle state and a single `step(dt, gx, gy)`;
// the React layer drives the loop and the WebGL renderer reads `particles`. The
// container is a circle (the HP orb) and gravity is an arbitrary vector so the
// device gyroscope can tilt it.

export interface Particle {
  /** working / predicted position (also the rendered position) */
  x: number;
  y: number;
  /** position at the start of the step, used to recover velocity */
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  /** density, recomputed each constraint iteration */
  rho: number;
  /** 0 = HP fluid, 1 = temp-HP shimmer layer (rendered as a tint on top) */
  kind: 0 | 1;
}

export interface SphParams {
  /** smoothing radius (px) */
  h: number;
  mass: number;
  /** rest density; seed value, auto-calibrated from the lattice unless pinned */
  restDensity: number;
  /** constraint-force-mixing relaxation (stabilizes the λ division) */
  epsRelax: number;
  /** constraint solve iterations per step */
  iterations: number;
  /** XSPH viscosity coefficient (the real energy dissipation) */
  xsph: number;
  /** artificial-pressure strength (anti-clustering, cleaner surface) */
  sCorrK: number;
  /** artificial-pressure reference distance as a fraction of h */
  sCorrDq: number;
  /** artificial-pressure exponent */
  sCorrN: number;
  /** velocity retained (and reflected) on a wall hit, 0..1 */
  restitution: number;
  /** gravity magnitude applied along the (gx,gy) direction */
  gravity: number;
  /** rest-lattice spacing as a fraction of h. Sets the slot count (capacity).
   * Tighter than the rest-density calibration on purpose: the pool settles
   * denser than its zero-gravity lattice, so capacity must over-provision
   * particles for a full orb to read full. */
  slotPack: number;
}

export const DEFAULT_PARAMS: SphParams = {
  h: 16,
  mass: 2.5,
  restDensity: 0, // calibrated from the rest lattice in the constructor
  epsRelax: 0.01,
  iterations: 3,
  xsph: 0.08,
  sCorrK: 0.0008,
  sCorrDq: 0.2,
  sCorrN: 4,
  restitution: 0.1,
  gravity: 1200,
  // 0.53 (tighter than the 0.62 rest-lattice) so a full orb settles to a small
  // bubble at the top instead of ~1/3 empty: the pool packs denser than its
  // zero-gravity lattice under gravity, so capacity over-provisions to compensate.
  slotPack: 0.53,
};

/** 2D kernel normalization constants for a given smoothing radius. */
export function kernels(h: number) {
  return {
    h,
    hsq: h * h,
    poly6: 4 / (Math.PI * Math.pow(h, 8)),
    spikyGrad: -10 / (Math.PI * Math.pow(h, 5)),
  };
}

/** Poly6 density contribution of a neighbour at squared distance r2 (0 if r>h). */
export function poly6(r2: number, h: number, mass: number): number {
  const hsq = h * h;
  if (r2 >= hsq) return 0;
  const c = 4 / (Math.PI * Math.pow(h, 8));
  const d = hsq - r2;
  return mass * c * d * d * d;
}

export interface SphOpts {
  cx: number;
  cy: number;
  radius: number;
  params?: Partial<SphParams>;
  /** injectable RNG for deterministic tests; defaults to Math.random */
  rng?: () => number;
}

export class Sph {
  particles: Particle[] = [];
  readonly params: SphParams;
  cx: number;
  cy: number;
  radius: number;

  private k: ReturnType<typeof kernels>;
  private rng: () => number;
  private cell: number; // grid cell size = h
  private cols: number;
  private rows: number;
  private heads: Int32Array;
  private next: Int32Array;
  private lambda: Float64Array;
  private dpx: Float64Array;
  private dpy: Float64Array;
  /** rest lattice slots inside the bowl, ordered bottom (full first) to top */
  private slots: { x: number; y: number }[];
  /** poly6 value at the artificial-pressure reference distance */
  private wDq: number;

  constructor(opts: SphOpts) {
    this.cx = opts.cx;
    this.cy = opts.cy;
    this.radius = opts.radius;
    this.params = { ...DEFAULT_PARAMS, ...opts.params };
    this.rng = opts.rng ?? Math.random;
    this.k = kernels(this.params.h);
    this.cell = this.params.h;
    this.cols = Math.ceil((this.radius * 2) / this.cell) + 3;
    this.rows = this.cols;
    this.heads = new Int32Array(this.cols * this.rows).fill(-1);
    this.next = new Int32Array(0);
    this.lambda = new Float64Array(0);
    this.dpx = new Float64Array(0);
    this.dpy = new Float64Array(0);

    this.slots = this.buildSlots();
    if (!opts.params || opts.params.restDensity == null || opts.params.restDensity <= 0) {
      this.params.restDensity = this.calibrateRestDensity();
    }
    const dq = this.params.sCorrDq * this.params.h;
    this.wDq = poly6(dq * dq, this.params.h, this.params.mass);
  }

  get count(): number {
    return this.particles.length;
  }

  /** The maximum number of particles the bowl can hold (a full orb). */
  get capacity(): number {
    return this.slots.length;
  }

  /** Total kinetic energy — trends to ~0 as the pool settles (the settling test). */
  kineticEnergy(): number {
    const m = this.params.mass;
    let ke = 0;
    for (const p of this.particles) ke += 0.5 * m * (p.vx * p.vx + p.vy * p.vy);
    return ke;
  }

  /**
   * Hex-packed rest positions inside the circle, ordered bottom-to-top so that
   * filling the first N slots produces a settled pool of N particles.
   */
  private buildSlots(): { x: number; y: number }[] {
    // Guard the externally-supplied slotPack: a 0 / negative / NaN value would
    // make the lattice step zero and spin these loops forever. Fall back to the
    // default lattice spacing rather than hang.
    const pack = Number.isFinite(this.params.slotPack) && this.params.slotPack > 0 ? this.params.slotPack : 0.62;
    const dx = this.params.h * pack;
    const dy = dx * 0.866;
    const r = this.radius - dx * 0.5;
    const slots: { x: number; y: number }[] = [];
    let row = 0;
    for (let y = this.cy + r; y >= this.cy - r; y -= dy, row++) {
      const half = Math.sqrt(Math.max(0, r * r - (y - this.cy) ** 2));
      const offset = row % 2 ? dx * 0.5 : 0;
      for (let x = this.cx - half + offset; x <= this.cx + half; x += dx) {
        slots.push({ x, y });
      }
    }
    return slots;
  }

  /** Density of a particle deep inside the rest lattice — the zero-pressure target. */
  private calibrateRestDensity(): number {
    const { mass, h } = this.params;
    const { hsq, poly6: P6 } = this.k;
    const dx = h * 0.62;
    const dy = dx * 0.866;
    let rho = 0;
    for (let ry = -2; ry <= 2; ry++) {
      const offset = ((ry % 2) + 2) % 2 ? dx * 0.5 : 0;
      for (let rxi = -3; rxi <= 3; rxi++) {
        const x = rxi * dx + offset;
        const y = ry * dy;
        const r2 = x * x + y * y;
        if (r2 < hsq) {
          const d = hsq - r2;
          rho += mass * P6 * d * d * d;
        }
      }
    }
    return rho;
  }

  /** Set the HP (kind 0) particle count — fills/drains from the bowl bottom. */
  setCount(n: number): Particle[] {
    return this.adjustKind(0, n);
  }

  /** Set the temp-HP (kind 1) count — a shimmer layer poured on top of the HP. */
  setTempCount(n: number): Particle[] {
    return this.adjustKind(1, n);
  }

  /** Count of a given kind currently in the bowl. */
  countOf(kind: 0 | 1): number {
    let c = 0;
    for (const p of this.particles) if (p.kind === kind) c++;
    return c;
  }

  private adjustKind(kind: 0 | 1, target: number): Particle[] {
    const cap = this.slots.length;
    // leave room for the other kind so HP and temp never spawn into the same slot
    const otherCount = this.countOf(kind === 0 ? 1 : 0);
    target = Math.max(0, Math.min(cap - otherCount, Math.round(target)));
    const mine = this.particles.filter((p) => p.kind === kind);
    if (target === mine.length) return [];
    if (target < mine.length) {
      // drain the topmost of THIS kind (smallest y)
      mine.sort((a, b) => a.y - b.y);
      const removed = mine.slice(0, mine.length - target);
      const rm = new Set(removed);
      this.particles = this.particles.filter((p) => !rm.has(p));
      return removed;
    }
    // grow: HP fills bottom-up; temp pours from the top so it lands on the surface
    const add = target - mine.length;
    for (let i = 0; i < add; i++) {
      const raw = kind === 0 ? mine.length + i : cap - 1 - (mine.length + i);
      const idx = Math.max(0, Math.min(cap - 1, raw));
      this.particles.push(this.spawn(this.slots[idx]!, kind));
    }
    return [];
  }

  /** A quick random impulse — a satisfying jolt of slosh on damage / heal. */
  splash(strength: number): void {
    for (const p of this.particles) {
      p.vx += (this.rng() - 0.5) * strength;
      p.vy += (this.rng() - 0.5) * strength;
    }
  }

  /** A fresh particle at a rest slot, with a touch of jitter and gentle inflow. */
  private spawn(slot: { x: number; y: number }, kind: 0 | 1 = 0): Particle {
    const j = this.params.h * 0.12;
    const x = slot.x + (this.rng() - 0.5) * j;
    const y = slot.y + (this.rng() - 0.5) * j;
    return { x, y, ox: x, oy: y, vx: (this.rng() - 0.5) * 6, vy: this.rng() * 8, rho: this.params.restDensity, kind };
  }

  /**
   * Advance the simulation by `dt` seconds under the gravity vector (gx, gy).
   * The vector's magnitude scales the pull (0 = weightless, 1 = full gravity);
   * lengths over 1 are clamped. So a unit "down" of (0, 1) is full strength.
   */
  step(dt: number, gx: number, gy: number): void {
    const ps = this.particles;
    const n = ps.length;
    if (n === 0) return;
    this.ensureArrays(n);

    // 1. apply gravity, predict positions.
    // Respect the vector's magnitude (don't renormalize): a near-horizontal
    // phone yields a short vector and so a gentle pull, instead of amplifying
    // sensor noise back to full strength. Clamp at unit length so an over-long
    // vector never pulls harder than a clean "down".
    const glen = Math.hypot(gx, gy);
    const scale = (glen > 1 ? 1 / glen : 1) * this.params.gravity;
    const gax = gx * scale;
    const gay = gy * scale;
    for (const p of ps) {
      p.ox = p.x;
      p.oy = p.y;
      p.vx += dt * gax;
      p.vy += dt * gay;
      p.x += dt * p.vx;
      p.y += dt * p.vy;
    }

    // 2. constraint solve on the predicted positions. Rebuild the neighbour grid
    // at the top of every iteration: applyDeltaP moves particles, so a grid built
    // once would go stale and mis-bucket any particle nudged into a new cell.
    // (Iteration 0 is unchanged — the grid is still built on the predicted
    // positions before the first applyDeltaP.)
    for (let iter = 0; iter < this.params.iterations; iter++) {
      this.buildGrid();
      this.computeLambda();
      this.applyDeltaP();
    }

    // 3. recover velocity from the net position change, then dissipate via XSPH
    const invDt = 1 / dt;
    for (const p of ps) {
      p.vx = (p.x - p.ox) * invDt;
      p.vy = (p.y - p.oy) * invDt;
    }
    this.applyXsphAndBounceVelocity();
  }

  private ensureArrays(n: number): void {
    if (this.lambda.length < n) {
      this.lambda = new Float64Array(n);
      this.dpx = new Float64Array(n);
      this.dpy = new Float64Array(n);
    }
    if (this.next.length < n) this.next = new Int32Array(n);
  }

  private cellIndex(x: number, y: number): number {
    let cx = Math.floor((x - (this.cx - this.radius)) / this.cell) + 1;
    let cy = Math.floor((y - (this.cy - this.radius)) / this.cell) + 1;
    if (cx < 0) cx = 0;
    else if (cx >= this.cols) cx = this.cols - 1;
    if (cy < 0) cy = 0;
    else if (cy >= this.rows) cy = this.rows - 1;
    return cy * this.cols + cx;
  }

  private buildGrid(): void {
    this.heads.fill(-1);
    const ps = this.particles;
    for (let i = 0; i < ps.length; i++) {
      const c = this.cellIndex(ps[i]!.x, ps[i]!.y);
      this.next[i] = this.heads[c]!;
      this.heads[c] = i;
    }
  }

  private forNeighbors(x: number, y: number, fn: (j: number) => void): void {
    const base = this.cellIndex(x, y);
    const cx = base % this.cols;
    const cy = (base - cx) / this.cols;
    for (let oy = -1; oy <= 1; oy++) {
      const ny = cy + oy;
      if (ny < 0 || ny >= this.rows) continue;
      for (let ox = -1; ox <= 1; ox++) {
        const nx = cx + ox;
        if (nx < 0 || nx >= this.cols) continue;
        let j = this.heads[ny * this.cols + nx]!;
        while (j !== -1) {
          fn(j);
          j = this.next[j]!;
        }
      }
    }
  }

  /** Spiky gradient magnitude factor for separation r (vector = factor * r_vec/r). */
  private spiky(r: number): number {
    const h = this.k.h;
    if (r <= 0 || r >= h) return 0;
    return this.k.spikyGrad * (h - r) * (h - r);
  }

  /** Per-particle density, then the PBF λ (constraint scaling factor). */
  private computeLambda(): void {
    const { mass, restDensity, epsRelax } = this.params;
    const { hsq, poly6: P6 } = this.k;
    const ps = this.particles;
    const invRho0 = 1 / restDensity;
    for (let i = 0; i < ps.length; i++) {
      const pi = ps[i]!;
      let rho = 0;
      // ∇_i C accumulates here; Σ|∇_k C|² accumulates in sumGrad2
      let gix = 0;
      let giy = 0;
      let sumGrad2 = 0;
      this.forNeighbors(pi.x, pi.y, (j) => {
        const pj = ps[j]!;
        const dx = pi.x - pj.x;
        const dy = pi.y - pj.y;
        const r2 = dx * dx + dy * dy;
        if (r2 < hsq) {
          const d = hsq - r2;
          rho += mass * P6 * d * d * d;
          if (j !== i && r2 > 0) {
            const r = Math.sqrt(r2);
            const f = this.spiky(r) * invRho0; // gradW * (1/ρ0)
            const gx = f * (dx / r);
            const gy = f * (dy / r);
            gix += gx;
            giy += gy;
            sumGrad2 += gx * gx + gy * gy; // |∇_j C|²
          }
        }
      });
      pi.rho = rho;
      sumGrad2 += gix * gix + giy * giy; // |∇_i C|²
      const c = rho * invRho0 - 1;
      this.lambda[i] = -c / (sumGrad2 + epsRelax);
    }
  }

  /** Apply the position corrections Δp from the current λ field. */
  private applyDeltaP(): void {
    const { mass, restDensity, sCorrK, sCorrN } = this.params;
    const { hsq, poly6: P6 } = this.k;
    const ps = this.particles;
    const invRho0 = 1 / restDensity;
    for (let i = 0; i < ps.length; i++) {
      const pi = ps[i]!;
      let dx0 = 0;
      let dy0 = 0;
      const li = this.lambda[i]!;
      this.forNeighbors(pi.x, pi.y, (j) => {
        if (j === i) return;
        const pj = ps[j]!;
        const dx = pi.x - pj.x;
        const dy = pi.y - pj.y;
        const r2 = dx * dx + dy * dy;
        if (r2 > 0 && r2 < hsq) {
          const r = Math.sqrt(r2);
          // artificial pressure: -k (W(r)/W(Δq))^n, anti-clustering
          const d = hsq - r2;
          const w = mass * P6 * d * d * d;
          const sCorr = -sCorrK * Math.pow(w / this.wDq, sCorrN);
          const coef = (li + this.lambda[j]! + sCorr) * this.spiky(r) * invRho0;
          dx0 += coef * (dx / r);
          dy0 += coef * (dy / r);
        }
      });
      this.dpx[i] = dx0;
      this.dpy[i] = dy0;
    }
    // apply, then project back into the bowl
    const margin = this.params.h * 0.25;
    const rmax = this.radius - margin;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i]!;
      p.x += this.dpx[i]!;
      p.y += this.dpy[i]!;
      const dx = p.x - this.cx;
      const dy = p.y - this.cy;
      const d = Math.hypot(dx, dy);
      if (d > rmax && d > 0) {
        p.x = this.cx + (dx / d) * rmax;
        p.y = this.cy + (dy / d) * rmax;
      }
    }
  }

  /** XSPH viscosity (settling) plus a soft normal-velocity bounce at the wall. */
  private applyXsphAndBounceVelocity(): void {
    const { mass, xsph, restitution } = this.params;
    const { hsq, poly6: P6 } = this.k;
    const ps = this.particles;
    if (xsph > 0) {
      const addx = this.dpx; // reuse scratch arrays
      const addy = this.dpy;
      for (let i = 0; i < ps.length; i++) {
        const pi = ps[i]!;
        let ax = 0;
        let ay = 0;
        this.forNeighbors(pi.x, pi.y, (j) => {
          if (j === i) return;
          const pj = ps[j]!;
          const dx = pi.x - pj.x;
          const dy = pi.y - pj.y;
          const r2 = dx * dx + dy * dy;
          if (r2 < hsq) {
            const d = hsq - r2;
            const w = (mass * P6 * d * d * d) / (pj.rho || mass);
            ax += (pj.vx - pi.vx) * w;
            ay += (pj.vy - pi.vy) * w;
          }
        });
        addx[i] = xsph * ax;
        addy[i] = xsph * ay;
      }
      for (let i = 0; i < ps.length; i++) {
        ps[i]!.vx += addx[i]!;
        ps[i]!.vy += addy[i]!;
      }
    }
    // soft bounce: kill (and reflect a fraction of) outward velocity at the wall
    const rmax = this.radius - this.params.h * 0.25;
    for (const p of ps) {
      const dx = p.x - this.cx;
      const dy = p.y - this.cy;
      const d = Math.hypot(dx, dy);
      if (d > rmax - 0.5 && d > 0) {
        const nx = dx / d;
        const ny = dy / d;
        const vn = p.vx * nx + p.vy * ny;
        if (vn > 0) {
          p.vx -= (1 + restitution) * vn * nx;
          p.vy -= (1 + restitution) * vn * ny;
        }
      }
    }
  }
}
