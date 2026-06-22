import "fake-indexeddb/auto";
import Dexie from "dexie";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHpDb, type HpDb } from "../../store/db";

// Mock the engine: rollHeadless returns a fixed record; createDiceTray yields a
// fake tray. Lets us test the tray's orchestration without WebGL (covered by e2e).
const { createDiceTray, rollHeadless } = vi.hoisted(() => {
  const rec = { notation: "1d20+5", total: 23, result: [18], dice: [{ sides: 20, value: 18, dropped: false }] };
  return {
    createDiceTray: vi.fn(async () => ({ roll: vi.fn(async () => rec), clear: vi.fn() })),
    rollHeadless: vi.fn(() => rec),
  };
});
vi.mock("./diceEngine", () => ({ createDiceTray, rollHeadless }));

const playSfx = vi.hoisted(() => vi.fn());
vi.mock("../../sound/sfx", () => ({ playSfx }));

import { DiceTray } from "./DiceTray";

const DB_NAME = "hoard-hp-tray-test";
let db: HpDb;
beforeEach(async () => {
  vi.clearAllMocks();
  await Dexie.delete(DB_NAME);
  db = createHpDb(DB_NAME);
});
afterEach(() => db.close());

const open = (over: Partial<React.ComponentProps<typeof DiceTray>> = {}) =>
  render(<DiceTray open onClose={vi.fn()} onApplyHeal={vi.fn()} db={db} reducedMotion {...over} />);

describe("DiceTray", () => {
  const addD20 = () => userEvent.click(screen.getByRole("button", { name: "Add d20" }));

  it("rolls via the headless engine under reduced motion and shows the result", async () => {
    open();
    await addD20();
    await userEvent.click(screen.getByRole("button", { name: /^throw/i }));
    await waitFor(() => expect(rollHeadless).toHaveBeenCalled());
    expect(createDiceTray).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText("23")).toBeInTheDocument());
  });

  it("plays the dice-clatter cue when dice are thrown", async () => {
    open();
    await addD20();
    await userEvent.click(screen.getByRole("button", { name: /^throw/i }));
    await waitFor(() => expect(playSfx).toHaveBeenCalledWith("roll"));
  });

  it("records the roll into history", async () => {
    open();
    await addD20();
    await userEvent.click(screen.getByRole("button", { name: /^throw/i }));
    await waitFor(() => expect(screen.getByText("23")).toBeInTheDocument());
    // open the log and see the entry (scope to the list, the result also shows the notation)
    await userEvent.click(screen.getByRole("button", { name: /log/i }));
    const items = await screen.findAllByRole("listitem");
    expect(items[0]).toHaveTextContent("1d20+5");
  });

  it("builds advantage notation from a lone d20", async () => {
    open();
    await addD20();
    await userEvent.click(screen.getByRole("button", { name: /^advantage/i }));
    await userEvent.click(screen.getByRole("button", { name: /^throw/i }));
    await waitFor(() => expect(rollHeadless).toHaveBeenCalledWith("2d20kh1"));
  });

  it("builds a mixed pool notation from multiple chips", async () => {
    open();
    await userEvent.click(screen.getByRole("button", { name: "Add d6" }));
    await userEvent.click(screen.getByRole("button", { name: "Add d6" }));
    await userEvent.click(screen.getByRole("button", { name: "Add d4" }));
    await userEvent.click(screen.getByRole("button", { name: /^throw/i }));
    await waitFor(() => expect(rollHeadless).toHaveBeenCalledWith("2d6+1d4"));
  });

  it("applies an ad-hoc roll as heal on demand", async () => {
    const onApplyHeal = vi.fn();
    open({ onApplyHeal });
    await addD20();
    await userEvent.click(screen.getByRole("button", { name: /^throw/i }));
    await waitFor(() => expect(screen.getByText("23")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /apply.*heal/i }));
    expect(onApplyHeal).toHaveBeenCalledWith(23);
  });

  it("clears the rendered result after applying as heal (no stale roll on reopen)", async () => {
    open();
    await addD20();
    await userEvent.click(screen.getByRole("button", { name: /^throw/i }));
    await waitFor(() => expect(screen.getByText("23")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /apply.*heal/i }));
    // The result plate (and its total) must be gone so it can't reappear on reopen.
    await waitFor(() => expect(screen.queryByText("23")).toBeNull());
  });

  it("preserves hand-edited notation when stepping the modifier", async () => {
    open();
    const field = screen.getByRole("textbox", { name: /dice notation/i });
    await userEvent.clear(field);
    await userEvent.type(field, "4d6kh3!");
    await userEvent.click(screen.getByRole("button", { name: /increase modifier/i }));
    // The hand-typed expression must NOT be rewritten from the (empty) pool.
    expect(field).toHaveValue("4d6kh3!");
  });

  it("lets the Normal button reset Advantage after the field is hand-edited (no stuck state)", async () => {
    open();
    // Pick Advantage on a lone d20, then hand-edit the notation → manual mode.
    await addD20();
    await userEvent.click(screen.getByRole("button", { name: /^advantage/i }));
    const adv = screen.getByRole("button", { name: /^advantage/i });
    expect(adv).toHaveAttribute("aria-pressed", "true");
    const field = screen.getByRole("textbox", { name: /dice notation/i });
    await userEvent.clear(field);
    await userEvent.type(field, "4d6kh3!");
    // Normal stays enabled in manual mode; clicking it must reset the mode (so the
    // adv/dis pressed+disabled state clears) WITHOUT rewriting the typed notation.
    await userEvent.click(screen.getByRole("button", { name: /^normal/i }));
    expect(screen.getByRole("button", { name: /^normal/i })).toHaveAttribute("aria-pressed", "true");
    expect(adv).toHaveAttribute("aria-pressed", "false");
    expect(field).toHaveValue("4d6kh3!");
  });

  it("closes from the ✕", async () => {
    const onClose = vi.fn();
    open({ onClose });
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("lazy-loads the 3D engine on open when motion is allowed", async () => {
    render(<DiceTray open onClose={vi.fn()} onApplyHeal={vi.fn()} db={db} reducedMotion={false} />);
    await waitFor(() => expect(createDiceTray).toHaveBeenCalled());
  });

  it("does not load the engine while closed", () => {
    render(<DiceTray open={false} onClose={vi.fn()} onApplyHeal={vi.fn()} db={db} reducedMotion={false} />);
    expect(createDiceTray).not.toHaveBeenCalled();
  });

  it("a fast open→close→reopen mid-load neither loses nor double-inits the engine", async () => {
    // First open kicks off a load we hold pending. Close + reopen while it's still
    // in flight, then let it resolve. The tray must end up with EXACTLY ONE live
    // engine — not lost (→ headless fallback) and not re-initialized (→ leaked tray).
    const tray = { roll: vi.fn(async () => ({ notation: "1d20+5", total: 23, result: [18], dice: [{ sides: 20, value: 18, dropped: false }] })), clear: vi.fn() };
    let resolveLoad!: (t: typeof tray) => void;
    createDiceTray.mockImplementationOnce(() => new Promise((res) => { resolveLoad = res; }));

    const onClose = vi.fn();
    const onApplyHeal = vi.fn();
    const { rerender } = render(<DiceTray open onClose={onClose} onApplyHeal={onApplyHeal} db={db} reducedMotion={false} />);
    await waitFor(() => expect(createDiceTray).toHaveBeenCalledTimes(1));
    // Close, then reopen, both while the single load is still pending.
    rerender(<DiceTray open={false} onClose={onClose} onApplyHeal={onApplyHeal} db={db} reducedMotion={false} />);
    rerender(<DiceTray open onClose={onClose} onApplyHeal={onApplyHeal} db={db} reducedMotion={false} />);
    // Let that one load resolve.
    resolveLoad(tray);

    // The engine is used on the next throw — proving it wasn't lost (no headless).
    await userEvent.click(screen.getByRole("button", { name: "Add d20" }));
    await userEvent.click(screen.getByRole("button", { name: /^throw/i }));
    await waitFor(() => expect(tray.roll).toHaveBeenCalled());
    expect(rollHeadless).not.toHaveBeenCalled();
    // And it was only ever initialized once — no double-init / leaked second tray.
    expect(createDiceTray).toHaveBeenCalledTimes(1);
  });

  it("ignores a tap on the dimmed area mid-roll — no sweep, no stuck Throwing", async () => {
    let resolveRoll!: (r: unknown) => void;
    const tray = { roll: vi.fn(() => new Promise((res) => { resolveRoll = res; })), clear: vi.fn() };
    createDiceTray.mockResolvedValueOnce(tray);
    render(<DiceTray open onClose={vi.fn()} onApplyHeal={vi.fn()} db={db} reducedMotion={false} />);
    await waitFor(() => expect(createDiceTray).toHaveBeenCalled());
    await userEvent.click(screen.getByRole("button", { name: "Add d20" }));
    await userEvent.click(screen.getByRole("button", { name: /^throw/i }));
    // Tap the scrim WHILE the dice are still in flight — must not sweep them.
    await userEvent.click(document.querySelector(".dice-tray__scrim")!);
    expect(tray.clear).not.toHaveBeenCalled();
    // The roll settles normally and the Throw button recovers (never stuck).
    resolveRoll({ notation: "1d20", total: 9, result: [9], dice: [{ sides: 20, value: 9, dropped: false }] });
    await waitFor(() => expect(document.querySelector(".dice-result__total")?.textContent).toBe("9"));
    expect(screen.getByRole("button", { name: /^throw/i })).toBeEnabled();
  });

  it("a jammed roll falls back to a headless result at the 6s timeout (not an empty result)", async () => {
    // Regression for Codex #130: the timeout's engine.clear() rejects the racing
    // roll promise; if that rejection beats the headless fallback, doRoll returns
    // null and the player gets NO number. The fallback must win the race.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      // Faithful to bindTray: the roll never settles on its own, and clear() REJECTS
      // it (abandon) — exactly the interaction that made the buggy order return null.
      let rejectRoll: ((e: Error) => void) | undefined;
      const tray = {
        roll: vi.fn(() => new Promise<never>((_, rej) => { rejectRoll = rej; })),
        clear: vi.fn(() => rejectRoll?.(new Error("dice roll superseded"))),
      };
      createDiceTray.mockResolvedValueOnce(tray);
      render(<DiceTray open onClose={vi.fn()} onApplyHeal={vi.fn()} db={db} reducedMotion={false} />);
      await act(async () => { await Promise.resolve(); }); // let the engine load resolve
      expect(createDiceTray).toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "Add d20" }));
      fireEvent.click(screen.getByRole("button", { name: /^throw/i }));
      expect(tray.roll).toHaveBeenCalled();
      await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
      expect(rollHeadless).toHaveBeenCalledWith("1d20");
      expect(tray.clear).toHaveBeenCalled(); // stuck throw swept
      expect(document.querySelector(".dice-result__total")?.textContent).toBe("23"); // fallback shown
    } finally {
      vi.useRealTimers();
    }
  });

  it("does NOT fall back while a long explosion chain keeps settling (timer re-arms per onProgress) — #149", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      let onProgress: (() => void) | undefined;
      let resolveRoll: ((rec: unknown) => void) | undefined;
      const tray = {
        // Capture the onProgress hook; never settle on our own — we drive it by hand.
        roll: vi.fn((_notation: string, op?: () => void) => {
          onProgress = op;
          return new Promise((res) => { resolveRoll = res; });
        }),
        clear: vi.fn(),
      };
      createDiceTray.mockResolvedValueOnce(tray);
      render(<DiceTray open onClose={vi.fn()} onApplyHeal={vi.fn()} db={db} reducedMotion={false} />);
      await act(async () => { await Promise.resolve(); });
      fireEvent.click(screen.getByRole("button", { name: "Add d20" }));
      fireEvent.click(screen.getByRole("button", { name: /^throw/i }));
      expect(tray.roll).toHaveBeenCalled();

      // A long chain: a settle every 4s (under the 6s window) for 16s total. Each
      // onProgress re-arms the window, so the idle gap never reaches 6s.
      for (let i = 0; i < 4; i++) {
        await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
        act(() => { onProgress?.(); });
      }
      expect(rollHeadless).not.toHaveBeenCalled(); // 16s elapsed, but never 6s idle
      expect(tray.clear).not.toHaveBeenCalled();

      // The chain finally settles with the real engine record — no fallback used.
      await act(async () => {
        resolveRoll?.({ notation: "1d20", total: 18, result: [18], dice: [{ sides: 20, value: 18, dropped: false }] });
        await Promise.resolve();
      });
      expect(rollHeadless).not.toHaveBeenCalled();
      expect(document.querySelector(".dice-result__total")?.textContent).toBe("18");
    } finally {
      vi.useRealTimers();
    }
  });

  describe("contextual rolls (shared tray — death save / Hit Die)", () => {
    it("death-save intent throws 1d20, applies via onDeathSave, records death-save context, and hides the builder", async () => {
      const onDeathSave = vi.fn();
      open({ intent: { kind: "death-save" }, onDeathSave });
      // No pool builder in contextual mode — it's locked to the one roll.
      expect(screen.queryByRole("button", { name: "Add d20" })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: /^throw/i }));
      await waitFor(() => expect(rollHeadless).toHaveBeenCalledWith("1d20"));
      await waitFor(() => expect(onDeathSave).toHaveBeenCalledWith(18));
      await waitFor(async () => {
        const rolls = await db.rolls.toArray();
        expect(rolls.at(-1)?.context).toBe("death-save");
      });
    });

    it("hit-die intent throws 1d{sides} and heals by the rolled value exactly once, only on Apply", async () => {
      const onHitDie = vi.fn();
      open({ intent: { kind: "hit-die", sides: 8, conMod: 2 }, onHitDie, onClose: vi.fn() });
      await userEvent.click(screen.getByRole("button", { name: /^throw/i }));
      await waitFor(() => expect(rollHeadless).toHaveBeenCalledWith("1d8"));
      // A settled Hit Die must NOT heal until the deliberate Apply confirm.
      expect(onHitDie).not.toHaveBeenCalled();
      await userEvent.click(await screen.findByRole("button", { name: /apply/i }));
      expect(onHitDie).toHaveBeenCalledTimes(1);
      expect(onHitDie).toHaveBeenCalledWith(18);
      await waitFor(async () => {
        const rolls = await db.rolls.toArray();
        expect(rolls.at(-1)?.context).toBe("hit-die");
      });
    });

    it("discards a contextual roll abandoned mid-throw — a late settle never applies", async () => {
      // Engine roll we resolve by hand, so we can close the tray mid-flight.
      let resolveRoll!: (r: unknown) => void;
      const tray = { roll: vi.fn(() => new Promise((res) => { resolveRoll = res; })), clear: vi.fn() };
      createDiceTray.mockResolvedValueOnce(tray);
      const onDeathSave = vi.fn();
      render(
        <DiceTray open intent={{ kind: "death-save" }} onDeathSave={onDeathSave}
          onClose={vi.fn()} onApplyHeal={vi.fn()} db={db} reducedMotion={false} />,
      );
      await waitFor(() => expect(createDiceTray).toHaveBeenCalled());
      await userEvent.click(screen.getByRole("button", { name: /^throw/i }));
      // Close while the physics is still in flight, then let it settle late.
      await userEvent.click(screen.getByRole("button", { name: /close dice/i }));
      resolveRoll({ notation: "1d20", total: 14, result: [14], dice: [{ sides: 20, value: 14, dropped: false }] });
      await new Promise((r) => setTimeout(r, 20));
      // The abandoned roll must NOT tick a death save (the bug: closing mid-roll then
      // a late settle changing/applying the result).
      expect(onDeathSave).not.toHaveBeenCalled();
    });

    it("gates re-throwing a Hit Die after it settles (single roll — no free short-rest rerolls)", async () => {
      open({ intent: { kind: "hit-die", sides: 8, conMod: 0 }, onHitDie: vi.fn(), onClose: vi.fn() });
      await userEvent.click(screen.getByRole("button", { name: /^throw/i }));
      // After settle: no re-throw, and no discard-as-Done (which would let a low roll
      // be tossed + re-rolled for free). Apply is the only commit (Codex #130).
      await waitFor(() => expect(screen.queryByRole("button", { name: /^throw/i })).not.toBeInTheDocument());
      expect(screen.queryByRole("button", { name: /^done$/i })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /apply/i })).toBeInTheDocument();
    });

    it("ignores a scrim tap under an intent so a death save can't be re-thrown / double-applied", async () => {
      const onDeathSave = vi.fn();
      open({ intent: { kind: "death-save" }, onDeathSave });
      await userEvent.click(screen.getByRole("button", { name: /^throw/i }));
      await waitFor(() => expect(onDeathSave).toHaveBeenCalledTimes(1));
      // After a save the dock shows Done; tapping the scrim must not reset back to Throw.
      await userEvent.click(document.querySelector(".dice-tray__scrim")!);
      expect(screen.getByRole("button", { name: /done/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^throw/i })).not.toBeInTheDocument();
    });
  });
});
