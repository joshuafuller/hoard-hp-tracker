import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS, kernels, poly6, Sph } from "./sph";

// A small deterministic RNG so spawn jitter is reproducible across runs.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSim(count: number, params = {}) {
  const sim = new Sph({ cx: 100, cy: 100, radius: 90, params, rng: mulberry32(42) });
  sim.setCount(count);
  return sim;
}

function settle(sim: Sph, gx: number, gy: number, steps = 500, dt = 0.004) {
  for (let i = 0; i < steps; i++) sim.step(dt, gx, gy);
}

function allFinite(sim: Sph): boolean {
  return sim.particles.every(
    (p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.vx) && Number.isFinite(p.vy),
  );
}

describe("poly6 kernel", () => {
  it("is positive inside the support radius and zero outside", () => {
    const h = 16;
    expect(poly6(0, h, 1)).toBeGreaterThan(0);
    expect(poly6(h * h * 0.5, h, 1)).toBeGreaterThan(0);
    expect(poly6(h * h, h, 1)).toBe(0);
    expect(poly6(h * h * 2, h, 1)).toBe(0);
  });

  it("decreases monotonically with distance", () => {
    const h = 16;
    const a = poly6(1, h, 1);
    const b = poly6(50, h, 1);
    const c = poly6(150, h, 1);
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
  });

  it("scales linearly with mass", () => {
    expect(poly6(10, 16, 4)).toBeCloseTo(4 * poly6(10, 16, 1), 10);
  });
});

describe("kernel constants", () => {
  it("are finite and have the expected signs", () => {
    const k = kernels(16);
    expect(k.poly6).toBeGreaterThan(0);
    expect(k.spikyGrad).toBeLessThan(0); // gradient points down the kernel
    expect(k.hsq).toBe(256);
  });
});

describe("Sph.setCount", () => {
  it("grows to the requested count", () => {
    const sim = makeSim(0);
    sim.setCount(50);
    expect(sim.count).toBe(50);
  });

  it("is a no-op when the count is unchanged", () => {
    const sim = makeSim(30);
    expect(sim.setCount(30)).toEqual([]);
    expect(sim.count).toBe(30);
  });

  it("drains the topmost particles first and returns them", () => {
    const sim = makeSim(40);
    settle(sim, 0, 1, 200); // let them pool at the bottom
    const beforeMaxY = Math.max(...sim.particles.map((p) => p.y));
    const removed = sim.setCount(25);
    expect(sim.count).toBe(25);
    expect(removed).toHaveLength(15);
    // the particles that remain are the lowest; the deepest one is still present
    const afterMaxY = Math.max(...sim.particles.map((p) => p.y));
    expect(afterMaxY).toBeCloseTo(beforeMaxY, 5);
    // every removed particle was above (smaller y than) every kept particle
    const keptMinY = Math.min(...sim.particles.map((p) => p.y));
    expect(Math.max(...removed.map((p) => p.y))).toBeLessThanOrEqual(keptMinY + 1e-6);
  });
});

describe("Sph.step — containment", () => {
  it("never lets a particle leave the bowl", () => {
    const sim = makeSim(120);
    settle(sim, 0, 1);
    expect(allFinite(sim)).toBe(true);
    const rmax = sim.radius;
    for (const p of sim.particles) {
      expect(Math.hypot(p.x - sim.cx, p.y - sim.cy)).toBeLessThanOrEqual(rmax + 1e-6);
    }
  });

  it("does nothing with zero particles", () => {
    const sim = makeSim(0);
    expect(() => sim.step(0.001, 0, 1)).not.toThrow();
    expect(sim.count).toBe(0);
  });
});

describe("Sph.step — gravity pools the liquid", () => {
  it("settles toward the bottom under downward gravity", () => {
    const sim = makeSim(120);
    settle(sim, 0, 1);
    const meanY = sim.particles.reduce((s, p) => s + p.y, 0) / sim.count;
    expect(meanY).toBeGreaterThan(sim.cy); // pooled below the centre
  });

  it("follows a tilted gravity vector to the low side", () => {
    const right = makeSim(120);
    settle(right, 1, 0); // gravity points +x
    const meanX = right.particles.reduce((s, p) => s + p.x, 0) / right.count;
    expect(meanX).toBeGreaterThan(right.cx);

    const left = makeSim(120);
    settle(left, -1, 0);
    const meanXL = left.particles.reduce((s, p) => s + p.x, 0) / left.count;
    expect(meanXL).toBeLessThan(left.cx);
  });

  it("stays finite (no blow-up) over a long run", () => {
    const sim = makeSim(150);
    settle(sim, 0.3, 1, 1000);
    expect(allFinite(sim)).toBe(true);
  });

  it("dissipates kinetic energy as it settles (PBF + XSPH)", () => {
    const sim = makeSim(140);
    sim.step(0.004, 0, 1); // one step to acquire fall velocity
    for (let i = 0; i < 10; i++) sim.step(0.004, 0, 1);
    const keEarly = sim.kineticEnergy();
    for (let i = 0; i < 600; i++) sim.step(0.004, 0, 1);
    const keLate = sim.kineticEnergy();
    expect(keLate).toBeLessThan(keEarly * 0.1); // settled to under 10% of peak motion
  });

  it("preserves volume — the pool does not collapse to a thin floor layer", () => {
    const sim = makeSim(140);
    settle(sim, 0, 1);
    // a 140/capacity fill should occupy a band, not pancake at the very bottom
    const ys = sim.particles.map((p) => p.y);
    const surface = Math.min(...ys);
    const floor = Math.max(...ys);
    expect(floor - surface).toBeGreaterThan(sim.radius * 0.5); // real depth
  });
});

describe("DEFAULT_PARAMS", () => {
  it("are sane", () => {
    expect(DEFAULT_PARAMS.h).toBeGreaterThan(0);
    expect(DEFAULT_PARAMS.restitution).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_PARAMS.restitution).toBeLessThanOrEqual(1);
    expect(DEFAULT_PARAMS.gravity).toBeGreaterThan(0);
  });
});
