import "fake-indexeddb/auto";
import Dexie from "dexie";
import { render, screen, waitFor } from "@testing-library/react";
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
});
