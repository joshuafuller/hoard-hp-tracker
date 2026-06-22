import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CoinSheet } from "./CoinSheet";
import { playSfx } from "../sound/sfx";

vi.mock("../sound/sfx", () => ({ playSfx: vi.fn() }));

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
  it("cues coinAdd on a value rise, coinSpend on a fall, silence when unchanged or on mount (#90/#148)", () => {
    vi.mocked(playSfx).mockClear();
    const rest = {
      total: 0, onAdd: vi.fn(), onSpend: vi.fn(), onSet: vi.fn(), onDistill: vi.fn(),
      lastDistill: null, onUndoDistill: vi.fn(), onDismissDistill: vi.fn(), onClose: vi.fn(),
    };
    const { rerender } = render(<CoinSheet pp={0} gp={1} sp={0} cp={0} {...rest} />);
    expect(playSfx).not.toHaveBeenCalled(); // baseline — no cue on mount
    rerender(<CoinSheet pp={0} gp={2} sp={0} cp={0} {...rest} />); // +1 gp → value up
    expect(playSfx).toHaveBeenLastCalledWith("coinAdd");
    vi.mocked(playSfx).mockClear();
    rerender(<CoinSheet pp={0} gp={2} sp={0} cp={0} {...rest} />); // unchanged (rejected-spend race)
    expect(playSfx).not.toHaveBeenCalled();
    rerender(<CoinSheet pp={0} gp={1} sp={0} cp={0} {...rest} />); // value fell
    expect(playSfx).toHaveBeenLastCalledWith("coinSpend");
  });

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

  it("retargets the same keypad to another denomination via the switcher", async () => {
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: /gold — 41 gp, edit/i }));
    // Switch to silver without closing, then spend.
    await userEvent.click(screen.getByRole("button", { name: /silver — 12 sp/i }));
    await userEvent.click(screen.getByRole("button", { name: "3" }));
    await userEvent.click(screen.getByRole("button", { name: /^spend$/i }));
    expect(p.onSpend).toHaveBeenCalledWith("sp", 3);
    expect(p.onAdd).not.toHaveBeenCalled();
  });

  it("distills from the console, behind a before→after confirmation", async () => {
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: /gold — 41 gp, edit/i })); // open the console
    await userEvent.click(screen.getByRole("button", { name: /distill to fewest coins/i }));
    const dialog = screen.getByRole("dialog", { name: /distill coins/i });
    expect(dialog).toBeInTheDocument();
    // Preview reflects 2pp 41gp 12sp 30cp → 6pp 2gp 5sp 0cp.
    expect(dialog).toHaveTextContent("6");
    await userEvent.click(screen.getByRole("button", { name: /^distill$/i }));
    expect(p.onDistill).toHaveBeenCalledTimes(1);
  });

  it("plays the distill cascade cue when a distill is confirmed (#90)", async () => {
    vi.mocked(playSfx).mockClear();
    setup();
    await userEvent.click(screen.getByRole("button", { name: /gold — 41 gp, edit/i }));
    await userEvent.click(screen.getByRole("button", { name: /distill to fewest coins/i }));
    await userEvent.click(screen.getByRole("button", { name: /^distill$/i }));
    expect(playSfx).toHaveBeenCalledWith("coinDistill");
  });

  it("does not call distill if the confirmation is cancelled, returning to the console", async () => {
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: /gold — 41 gp, edit/i }));
    await userEvent.click(screen.getByRole("button", { name: /distill to fewest coins/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(p.onDistill).not.toHaveBeenCalled();
    // Back on the console (the switcher is present).
    expect(screen.getByRole("button", { name: /gold — 41 gp/i })).toBeInTheDocument();
  });

  it("disables the console distill when the purse is already minimal", async () => {
    setup({ pp: 6, gp: 2, sp: 5, cp: 0, total: 62.5 });
    await userEvent.click(screen.getByRole("button", { name: /gold — 2 gp, edit/i }));
    expect(screen.getByRole("button", { name: /already distilled/i })).toBeDisabled();
  });

  it("offers the undo ON the console after a distill and reverts on tap", async () => {
    const p = setup({ lastDistill: { pp: 0, gp: 0, sp: 0, cp: 123 } });
    // No undo on the overview — it lives on the console.
    expect(screen.queryByRole("button", { name: /undo/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /gold — 41 gp, edit/i }));
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

  it("closes the overview on Escape", () => {
    const p = setup();
    expect(screen.getByRole("dialog", { name: /coins/i })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(p.onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape from the keypad returns to the overview without closing the sheet", async () => {
    const p = setup();
    // Open the per-denomination keypad (a sub-view that owns its own Escape).
    await userEvent.click(screen.getByRole("button", { name: /gold — 41 gp, edit/i }));
    fireEvent.keyDown(window, { key: "Escape" });
    // The sheet itself must not close; we're back on the overview.
    expect(p.onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: /coins/i })).toBeInTheDocument();
  });

  it("Escape from the distill confirmation does not close the whole sheet", async () => {
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: /gold — 41 gp, edit/i }));
    await userEvent.click(screen.getByRole("button", { name: /distill to fewest coins/i }));
    expect(screen.getByRole("dialog", { name: /distill coins/i })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(p.onClose).not.toHaveBeenCalled();
  });

  it("marks the active denomination with aria-pressed in the switcher", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: /gold — 41 gp, edit/i }));
    const gold = screen.getByRole("button", { name: /gold — 41 gp$/i });
    const silver = screen.getByRole("button", { name: /silver — 12 sp$/i });
    expect(gold).toHaveAttribute("aria-pressed", "true");
    expect(silver).toHaveAttribute("aria-pressed", "false");
  });
});
