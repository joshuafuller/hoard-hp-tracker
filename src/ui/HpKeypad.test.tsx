import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HpKeypad } from "./HpKeypad";

function setup(over = {}) {
  const props = {
    current: 24, max: 30, temp: 0,
    onDamage: vi.fn(), onHeal: vi.fn(), onSetCurrent: vi.fn(),
    onSetTemp: vi.fn(), onClose: vi.fn(), ...over,
  };
  render(<HpKeypad {...props} />);
  return props;
}
const tap = (name: string | RegExp) => userEvent.click(screen.getByRole("button", { name }));

describe("HpKeypad", () => {
  it("builds the amount from digit taps", async () => {
    setup();
    await tap("9"); await tap("0");
    expect(screen.getByTestId("keypad-amount")).toHaveTextContent("90");
  });

  it("backspace removes the last digit, clear empties it", async () => {
    setup();
    await tap("1"); await tap("2"); await tap("3");
    await tap(/backspace/i);
    expect(screen.getByTestId("keypad-amount")).toHaveTextContent("12");
    await tap(/clear/i);
    expect(screen.getByTestId("keypad-amount")).toHaveTextContent("0");
  });

  it("applies damage with the typed amount and closes", async () => {
    const p = setup();
    await tap("9");
    await tap(/^damage/i);
    expect(p.onDamage).toHaveBeenCalledWith(9);
    expect(p.onClose).toHaveBeenCalled();
  });

  it("applies heal with the typed amount", async () => {
    const p = setup();
    await tap("7");
    await tap(/^heal/i);
    expect(p.onHeal).toHaveBeenCalledWith(7);
  });

  it("applies set with the typed amount", async () => {
    const p = setup();
    await tap("5");
    await tap(/^set /i);
    expect(p.onSetCurrent).toHaveBeenCalledWith(5);
  });

  it("does nothing when the amount is empty", async () => {
    const p = setup();
    await tap(/^damage/i);
    expect(p.onDamage).not.toHaveBeenCalled();
    expect(p.onClose).not.toHaveBeenCalled();
  });

  it("closes on backdrop click and Escape", async () => {
    const p = setup();
    await userEvent.click(screen.getByTestId("keypad-backdrop"));
    expect(p.onClose).toHaveBeenCalledTimes(1);
    await userEvent.keyboard("{Escape}");
    expect(p.onClose).toHaveBeenCalledTimes(2);
  });

  it("is a labelled dialog", () => {
    setup();
    expect(screen.getByRole("dialog", { name: /amount|hp/i })).toBeInTheDocument();
  });
});
