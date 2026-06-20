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
});
