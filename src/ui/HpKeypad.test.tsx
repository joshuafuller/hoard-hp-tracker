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

  it("backspace removes the last digit", async () => {
    setup();
    await tap("1"); await tap("2"); await tap("3");
    await tap(/backspace/i);
    expect(screen.getByTestId("keypad-amount")).toHaveTextContent("12");
  });

  it("clear empties the amount", async () => {
    setup();
    await tap("1"); await tap("2"); await tap("3");
    await tap(/clear/i);
    expect(screen.getByTestId("keypad-amount")).toHaveTextContent("0");
  });

  it("builds the amount from hardware digit keys", async () => {
    setup();
    await userEvent.keyboard("42");
    expect(screen.getByTestId("keypad-amount")).toHaveTextContent("42");
  });

  it("caps the amount at 4 digits", async () => {
    setup();
    await userEvent.keyboard("12345");
    expect(screen.getByTestId("keypad-amount")).toHaveTextContent("1234");
  });

  it("hardware Backspace removes the last digit", async () => {
    setup();
    await userEvent.keyboard("12{Backspace}");
    expect(screen.getByTestId("keypad-amount")).toHaveTextContent("1");
  });

  it("applies damage with the typed amount and closes", async () => {
    const p = setup();
    await tap("9");
    await tap(/^damage/i);
    expect(p.onDamage).toHaveBeenCalledWith(9);
    expect(p.onClose).toHaveBeenCalled();
  });

  it("applies heal with the typed amount and closes", async () => {
    const p = setup();
    await tap("7");
    await tap(/^heal/i);
    expect(p.onHeal).toHaveBeenCalledWith(7);
    expect(p.onClose).toHaveBeenCalled();
  });

  it("applies set with the typed amount and closes", async () => {
    const p = setup();
    await tap("5");
    await tap(/^set /i);
    expect(p.onSetCurrent).toHaveBeenCalledWith(5);
    expect(p.onClose).toHaveBeenCalled();
  });

  it("applies temp with the typed amount and closes", async () => {
    const p = setup();
    await tap("8");
    await tap(/^temp/i);
    expect(p.onSetTemp).toHaveBeenCalledWith(8);
    expect(p.onClose).toHaveBeenCalled();
  });

  it("sets current to an explicitly-typed 0 and closes", async () => {
    const p = setup();
    await tap("0");
    await tap(/^set /i);
    expect(p.onSetCurrent).toHaveBeenCalledWith(0);
    expect(p.onClose).toHaveBeenCalled();
  });

  it("does nothing when the amount is empty", async () => {
    const p = setup();
    await tap(/^damage/i);
    await tap(/^set /i);
    expect(p.onDamage).not.toHaveBeenCalled();
    expect(p.onSetCurrent).not.toHaveBeenCalled();
    expect(p.onClose).not.toHaveBeenCalled();
  });

  it("closes on backdrop click", async () => {
    const p = setup();
    await userEvent.click(screen.getByTestId("keypad-backdrop"));
    expect(p.onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", async () => {
    const p = setup();
    await userEvent.keyboard("{Escape}");
    expect(p.onClose).toHaveBeenCalledTimes(1);
  });

  it("is a labelled dialog", () => {
    setup();
    expect(screen.getByRole("dialog", { name: /amount|hp/i })).toBeInTheDocument();
  });

  it("focuses the first control on mount", () => {
    setup();
    expect(screen.getByRole("button", { name: "1" })).toHaveFocus();
  });

  it("traps Tab focus within the dialog", async () => {
    setup();
    // Type a digit so the action buttons are enabled (and thus focusable);
    // the last one must wrap back to the first on Tab.
    await userEvent.keyboard("5");
    const first = screen.getByRole("button", { name: "1" });
    const temp = screen.getByRole("button", { name: /^temp/i });
    temp.focus();
    await userEvent.tab();
    expect(first).toHaveFocus();
  });
});
