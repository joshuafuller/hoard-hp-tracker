import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiquidVessel } from "./LiquidVessel";
import { ORB_DRAG_HINT_KEY } from "./orbDragHint";

/**
 * Orb-as-input: a vertical drag on the orb applies damage (down) / heal (up),
 * proportional to the orb height; a tap opens the keypad instead.
 * jsdom has no layout, so we stub the orb's measured height.
 */
function setup() {
  const onDamage = vi.fn();
  const onHeal = vi.fn();
  const onEditCurrent = vi.fn();
  render(
    <LiquidVessel
      current={27}
      max={40}
      temp={0}
      onDamage={onDamage}
      onHeal={onHeal}
      onEditCurrent={onEditCurrent}
    />,
  );
  const orb = screen.getByTestId("hp-bar");
  Object.defineProperty(orb, "clientHeight", { value: 200, configurable: true });
  return { orb, onDamage, onHeal, onEditCurrent };
}

describe("LiquidVessel orb-drag input", () => {
  it("drag DOWN applies damage proportional to the orb height", () => {
    const { orb, onDamage, onHeal } = setup();
    fireEvent.pointerDown(orb, { clientY: 0, pointerId: 1, button: 0 });
    fireEvent.pointerMove(orb, { clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(orb, { clientY: 100, pointerId: 1 });
    expect(onDamage).toHaveBeenCalledWith(20); // 100/200 * 40
    expect(onHeal).not.toHaveBeenCalled();
  });

  it("drag UP applies heal", () => {
    const { orb, onDamage, onHeal } = setup();
    fireEvent.pointerDown(orb, { clientY: 150, pointerId: 1, button: 0 });
    fireEvent.pointerMove(orb, { clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(orb, { clientY: 50, pointerId: 1 });
    expect(onHeal).toHaveBeenCalledWith(20);
    expect(onDamage).not.toHaveBeenCalled();
  });

  it("renders the live drag delta ABOVE the readout — a .vessel child, not trapped in the orb's isolation context", () => {
    const { orb } = setup();
    // Mid-drag (down → damage): the delta chip appears.
    fireEvent.pointerDown(orb, { clientY: 0, pointerId: 1, button: 0 });
    fireEvent.pointerMove(orb, { clientY: 100, pointerId: 1 });

    const delta = document.querySelector(".vessel__drag");
    expect(delta, "drag delta must render mid-drag").toBeTruthy();
    expect(delta!.textContent).toBe("−20");
    // The orb sets `isolation: isolate`, which would trap the delta BEHIND the
    // readout numerals if it lived inside the orb (the #94 regression). It must be
    // a direct child of `.vessel` and a later sibling than `.vessel__readout`.
    const vessel = orb.closest(".vessel")!;
    expect(delta!.parentElement).toBe(vessel);
    expect(delta!.closest(".vessel__orb")).toBeNull();
    const readout = vessel.querySelector(".vessel__readout");
    expect(readout, "readout must exist for a meaningful order check").toBeTruthy();
    const kids = [...vessel.children];
    const readoutIdx = kids.indexOf(readout as Element);
    expect(readoutIdx).toBeGreaterThanOrEqual(0);
    expect(kids.indexOf(delta as Element)).toBeGreaterThan(readoutIdx);

    fireEvent.pointerUp(orb, { clientY: 100, pointerId: 1 });
  });

  it("a tap (no real drag) does not change HP", () => {
    const { orb, onDamage, onHeal } = setup();
    fireEvent.pointerDown(orb, { clientY: 100, pointerId: 1, button: 0 });
    fireEvent.pointerUp(orb, { clientY: 102, pointerId: 1 });
    expect(onDamage).not.toHaveBeenCalled();
    expect(onHeal).not.toHaveBeenCalled();
  });

  it("tapping the HP number still opens the keypad", () => {
    const { onEditCurrent } = setup();
    fireEvent.click(screen.getByTestId("hp-current"));
    expect(onEditCurrent).toHaveBeenCalled();
  });

  it("shows a temp-HP band in the static fallback, even at full HP (#110, Codex P2)", () => {
    // jsdom has no WebGL2, so LiquidVessel renders the static fallback path.
    const { container } = render(<LiquidVessel current={40} max={40} temp={10} />);
    const band = container.querySelector(".vessel__fallback-temp") as HTMLElement;
    expect(band).toBeTruthy();
    // bottom anchor is clamped so the band stays inside the orb at full HP:
    // tempH = 10/40 = .25 → bottom = min(1, 1-.25) = .75
    expect(band.style.bottom).toBe("75%");
    expect(band.style.height).toBe("25%");
  });

  it("omits the temp band when there is no temp HP", () => {
    const { container } = render(<LiquidVessel current={20} max={40} temp={0} />);
    expect(container.querySelector(".vessel__fallback-temp")).toBeNull();
  });

  it("a vertical drag that starts on the readout overlay applies damage too (#105)", () => {
    const { orb, onDamage } = setup();
    // The readout sits over the orb; its drag must scale to the ORB's height.
    const readout = orb.parentElement?.querySelector(".vessel__readout") as HTMLElement;
    expect(readout).toBeTruthy();
    fireEvent.pointerDown(readout, { clientY: 0, pointerId: 2, button: 0 });
    fireEvent.pointerMove(readout, { clientY: 100, pointerId: 2 });
    fireEvent.pointerUp(readout, { clientY: 100, pointerId: 2 });
    expect(onDamage).toHaveBeenCalledWith(20); // 100/200 * 40, measured off the orb
  });

  it("a browser/OS-cancelled drag clears state WITHOUT committing damage/heal (#105)", () => {
    const { orb, onDamage, onHeal } = setup();
    fireEvent.pointerDown(orb, { clientY: 0, pointerId: 1, button: 0 });
    fireEvent.pointerMove(orb, { clientY: 100, pointerId: 1 }); // would be -20 HP on commit
    fireEvent.pointerCancel(orb, { clientY: 100, pointerId: 1 });
    expect(onDamage).not.toHaveBeenCalled();
    expect(onHeal).not.toHaveBeenCalled();

    // and the drag state is cleared: a later tap still opens the keypad, not a stale drag
    fireEvent.pointerUp(orb, { clientY: 100, pointerId: 1 });
    expect(onDamage).not.toHaveBeenCalled();
    expect(onHeal).not.toHaveBeenCalled();
  });
});

describe("LiquidVessel drag-hint affordance (#94)", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("telegraphs the drag affordance until the orb is dragged, then recedes", () => {
    const { orb } = setup();
    expect(document.querySelector(".vessel__drag-hint")).toBeTruthy();
    // A committed drag marks the affordance discovered → the hint disappears…
    fireEvent.pointerDown(orb, { clientY: 0, pointerId: 1, button: 0 });
    fireEvent.pointerMove(orb, { clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(orb, { clientY: 100, pointerId: 1 });
    expect(document.querySelector(".vessel__drag-hint")).toBeNull();
    // …and persists, so it won't nag next session.
    expect(localStorage.getItem(ORB_DRAG_HINT_KEY)).toBe("true");
  });

  it("does not nag once the seen flag is persisted", () => {
    localStorage.setItem(ORB_DRAG_HINT_KEY, "true");
    const { container } = render(<LiquidVessel current={27} max={40} temp={0} />);
    expect(container.querySelector(".vessel__drag-hint")).toBeNull();
  });

  it("does not show the hint at 0 HP (nothing to drag down from)", () => {
    const { container } = render(<LiquidVessel current={0} max={40} temp={0} />);
    expect(container.querySelector(".vessel__drag-hint")).toBeNull();
  });

  it("renders the hint as decorative + inert (aria-hidden; pointer-events:none lives in CSS)", () => {
    setup();
    const hint = document.querySelector(".vessel__drag-hint") as HTMLElement;
    expect(hint).toBeTruthy();
    // It's decorative — hidden from a11y; the pointer-events:none that keeps it from
    // blocking the drag/tap path is enforced in styles.css (not assertable in jsdom).
    expect(hint.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("LiquidVessel heartbeat pulse (#220)", () => {
  const heartbeat = (c: HTMLElement) => c.querySelector(".vessel__heartbeat");

  it("pulses in the danger zone (≤50% HP)", () => {
    const { container } = render(<LiquidVessel current={5} max={40} temp={0} />); // 12.5%
    expect(heartbeat(container)).toBeTruthy();
  });

  it("does not pulse when healthy (>50%)", () => {
    const { container } = render(<LiquidVessel current={30} max={40} temp={0} />); // 75%
    expect(heartbeat(container)).toBeNull();
  });

  it("does not pulse at 0 HP — flatline", () => {
    const { container } = render(<LiquidVessel current={0} max={40} temp={0} />);
    expect(heartbeat(container)).toBeNull();
  });

  it("quickens (shorter beat period) as HP falls toward 0", () => {
    const period = (current: number) => {
      const { container } = render(<LiquidVessel current={current} max={40} temp={0} />);
      const v = container.querySelector(".vessel") as HTMLElement;
      return parseFloat(v.style.getPropertyValue("--heartbeat-period"));
    };
    expect(period(1)).toBeGreaterThan(0);
    expect(period(1)).toBeLessThan(period(20)); // near 0 beats faster than just-bloodied
  });

  it("does not pulse under prefers-reduced-motion", () => {
    const orig = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
    try {
      const { container } = render(<LiquidVessel current={5} max={40} temp={0} />);
      expect(heartbeat(container)).toBeNull();
    } finally {
      window.matchMedia = orig;
    }
  });
});
