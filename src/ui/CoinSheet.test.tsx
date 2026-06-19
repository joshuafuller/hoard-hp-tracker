import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CoinSheet } from "./CoinSheet";

function setup(over = {}) {
  const props = {
    pp: 2,
    gp: 41,
    sp: 12,
    cp: 30,
    total: 62.5,
    onAdd: vi.fn(),
    onSpend: vi.fn(),
    onSet: vi.fn(),
    onDistill: vi.fn(),
    lastDistill: null,
    onUndoDistill: vi.fn(),
    onDismissDistill: vi.fn(),
    onClose: vi.fn(),
    ...over,
  };
  render(<CoinSheet {...props} />);
  return props;
}

describe("CoinSheet", () => {
  it("shows the four denominations and the gold total", () => {
    setup();
    expect(screen.getByRole("dialog", { name: /coins/i })).toBeInTheDocument();
    expect(screen.getByTestId("coins-total")).toHaveTextContent("62.5 gp");
    expect(screen.getByRole("button", { name: /platinum — 2 pp, edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /gold — 41 gp, edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /silver — 12 sp, edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copper — 30 cp, edit/i })).toBeInTheDocument();
  });

  it("adds one coin from the inline + stepper", async () => {
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: /add 1 gold/i }));
    expect(p.onAdd).toHaveBeenCalledWith("gp", 1);
  });

  it("spends one coin from the inline − stepper", async () => {
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: /spend 1 silver/i }));
    expect(p.onSpend).toHaveBeenCalledWith("sp", 1);
  });

  it("opens the keypad from a row's count and adds the typed amount", async () => {
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: /gold — 41 gp, edit/i }));
    await userEvent.click(screen.getByRole("button", { name: "7" }));
    await userEvent.click(screen.getByRole("button", { name: /^add$/i }));
    expect(p.onAdd).toHaveBeenCalledWith("gp", 7);
  });

  it("confirms before distilling and shows the before→after preview", async () => {
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: /distill to fewest coins/i }));
    const dialog = screen.getByRole("dialog", { name: /distill coins/i });
    expect(dialog).toBeInTheDocument();
    // Preview reflects 2pp 41gp 12sp 30cp → 6pp 2gp 5sp 0cp.
    expect(dialog).toHaveTextContent("6");
    await userEvent.click(screen.getByRole("button", { name: /^distill$/i }));
    expect(p.onDistill).toHaveBeenCalledTimes(1);
  });

  it("does not call distill if the confirmation is cancelled", async () => {
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: /distill to fewest coins/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(p.onDistill).not.toHaveBeenCalled();
    // Back on the rows.
    expect(screen.getByRole("button", { name: /gold — 41 gp, edit/i })).toBeInTheDocument();
  });

  it("disables distill when the purse is already minimal", () => {
    setup({ pp: 6, gp: 2, sp: 5, cp: 0, total: 62.5 });
    expect(screen.getByRole("button", { name: /already distilled/i })).toBeDisabled();
  });

  it("offers an undo after a distill and reverts on tap", async () => {
    const p = setup({ lastDistill: { pp: 0, gp: 0, sp: 0, cp: 123 } });
    const undo = screen.getByRole("button", { name: /undo/i });
    expect(undo).toBeInTheDocument();
    await userEvent.click(undo);
    expect(p.onUndoDistill).toHaveBeenCalled();
  });

  it("closes on backdrop click", async () => {
    const p = setup();
    await userEvent.click(screen.getByTestId("coin-backdrop"));
    expect(p.onClose).toHaveBeenCalled();
  });
});
