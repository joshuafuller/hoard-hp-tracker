import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LiquidVessel } from "./LiquidVessel";

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
