# Quick Damage / Heal Keypad Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a number-first quick-entry keypad (apply an exact amount as Damage/Heal/Set/Temp) plus a single-level Undo, so applying HP changes takes one entry instead of repeated stepper taps.

**Architecture:** A new `HpKeypad` bottom-sheet (presentational) feeds typed amounts into the existing `useHp` domain actions. `useHp` gains a one-deep snapshot of the prior HP fields and an `undo()` that restores them; a transient `UndoPill` surfaces it. `App` opens the keypad when the current-HP number (or temp badge) is tapped; `/max` keeps the existing editor.

**Tech Stack:** React 19 + TypeScript, Vite, vitest + @testing-library/react, Dexie (IndexedDB), pnpm (`corepack pnpm ...`).

**Spec:** `docs/superpowers/specs/2026-06-15-quick-damage-heal-keypad-design.md`

---

## File Structure

- `src/store/useHp.ts` (modify) — add `undo()` + `lastChange` snapshot tracking.
- `src/store/useHp.test.ts` (modify) — undo tests.
- `src/ui/HpKeypad.tsx` (create) — the bottom-sheet number pad.
- `src/ui/HpKeypad.test.tsx` (create) — keypad behaviour tests.
- `src/ui/UndoPill.tsx` (create) — transient undo pill.
- `src/ui/UndoPill.test.tsx` (create) — pill tests.
- `src/styles.css` (modify) — keypad + pill styles (reuse `.hp-editor` tokens).
- `src/App.tsx` (modify) — open keypad on HP/temp tap, render pill, keep editor for max.
- `src/App.test.tsx` (modify) — integration tests.

Conventions to follow (already in the codebase): modal = backdrop `div` + `role="dialog"` sheet with Escape/Tab trap and `haptic()` on tap (see `src/ui/HpValueEditor.tsx`); store actions return `Promise<void>` and run through the resilient `write()` wrapper; tests use `renderHook(() => useHp(db))` with a per-test `createHpDb(DB_NAME)`.

---

## Task 1: `useHp.undo()` + last-change tracking

**Files:**
- Modify: `src/store/useHp.ts`
- Test: `src/store/useHp.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/store/useHp.test.ts` (inside a new `describe`):

```ts
describe("undo", () => {
  it("reverts the last damage", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.damage(6)); // 10 -> 4
    await waitFor(() => expect(result.current.current).toBe(4));
    expect(result.current.lastChange).toMatchObject({ kind: "damage", amount: 6 });
    await act(() => result.current.undo());
    await waitFor(() => expect(result.current.current).toBe(10));
    expect(result.current.lastChange).toBeNull();
  });

  it("reverts the last heal", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.damage(8)); // 10 -> 2
    await waitFor(() => expect(result.current.current).toBe(2));
    await act(() => result.current.heal(5)); // 2 -> 7
    await waitFor(() => expect(result.current.current).toBe(7));
    await act(() => result.current.undo()); // back to 2
    await waitFor(() => expect(result.current.current).toBe(2));
  });

  it("reverts the last temp set", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.setTempValue(9));
    await waitFor(() => expect(result.current.temp).toBe(9));
    await act(() => result.current.undo());
    await waitFor(() => expect(result.current.temp).toBe(0));
  });

  it("only undoes the most recent action (single level)", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.damage(3)); // 10 -> 7
    await act(() => result.current.damage(2)); // 7 -> 5
    await waitFor(() => expect(result.current.current).toBe(5));
    await act(() => result.current.undo()); // 5 -> 7
    await waitFor(() => expect(result.current.current).toBe(7));
    await act(() => result.current.undo()); // no-op, nothing tracked
    await waitFor(() => expect(result.current.current).toBe(7));
  });

  it("is a no-op when nothing has changed", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.lastChange).toBeNull();
    await act(() => result.current.undo());
    await waitFor(() => expect(result.current.current).toBe(10));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `corepack pnpm exec vitest run src/store/useHp.test.ts -t "undo"`
Expected: FAIL — `result.current.undo`/`lastChange` are undefined.

- [ ] **Step 3: Implement undo + lastChange in `useHp.ts`**

Add `useState` to the React import:

```ts
import { useState } from "react";
```

Add the type and interface members. Near the top (after imports), add:

```ts
/** The last undoable HP change, surfaced to the UI for the Undo pill. */
export interface HpLastChange {
  kind: "damage" | "heal" | "set" | "temp";
  amount: number;
  /** The HP-bearing fields as they were *before* the action, for undo. */
  before: Pick<HpRecord, "current" | "temp" | "successes" | "failures">;
}
```

In `UseHpResult`, add:

```ts
  undo: () => Promise<void>;
  /** Clear the last-change pill without reverting. */
  dismissLastChange: () => void;
  lastChange: HpLastChange | null;
```

Inside `useHp`, after `const state: HpRecord = record ?? SEED;`, add:

```ts
  const [lastChange, setLastChange] = useState<HpLastChange | null>(null);
```

After the existing action helpers (before the `return`), add the undoable wrapper and undo:

```ts
  // Wrap a mutating action so the pre-action HP fields are captured for a
  // single-level undo. `state` is the rendered record at tap time — fine for a
  // deliberate keypad action (no concurrent write storm).
  const undoable =
    (kind: HpLastChange["kind"], action: (n: number) => Promise<void>) =>
    async (n: number) => {
      const before = {
        current: state.current,
        temp: state.temp,
        successes: state.successes,
        failures: state.failures,
      };
      await action(n);
      setLastChange({ kind, amount: n, before });
    };

  // Restore only the HP-bearing fields, so an unrelated change (e.g. hit dice)
  // between the action and the undo is preserved.
  const undo = async () => {
    const lc = lastChange;
    if (!lc) return;
    setLastChange(null);
    await write((r) => ({ ...r, ...lc.before }))();
  };

  // Dismiss the pill (timeout / next action) without reverting.
  const dismissLastChange = () => setLastChange(null);
```

In the returned object, wrap the four undoable actions and expose `undo`/`lastChange`. Change these lines:

```ts
    damage: undoable("damage", damageAction),
    heal: undoable("heal", applyHp(heal)),
    setCurrent: undoable("set", applyHp(setCurrent)),
    setTempValue: undoable("temp", setTempValue),
```

and add (anywhere in the returned object):

```ts
    undo,
    dismissLastChange,
    lastChange,
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `corepack pnpm exec vitest run src/store/useHp.test.ts`
Expected: PASS (all existing + new undo tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/useHp.ts src/store/useHp.test.ts
git commit -m "feat(store): single-level undo + lastChange tracking (US-2)"
```

---

## Task 2: `HpKeypad` component

**Files:**
- Create: `src/ui/HpKeypad.tsx`
- Test: `src/ui/HpKeypad.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/ui/HpKeypad.test.tsx`:

```tsx
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

  it("applies heal, set, and temp with the typed amount", async () => {
    const p = setup();
    await tap("7");
    await tap(/^heal/i);
    expect(p.onHeal).toHaveBeenCalledWith(7);

    setup({ onHeal: p.onHeal });
    await tap("5"); await tap(/^set /i);
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `corepack pnpm exec vitest run src/ui/HpKeypad.test.tsx`
Expected: FAIL — cannot find module `./HpKeypad`.

- [ ] **Step 3: Implement `HpKeypad.tsx`**

Create `src/ui/HpKeypad.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";

export interface HpKeypadProps {
  current: number;
  max: number;
  temp: number;
  onDamage: (n: number) => void;
  onHeal: (n: number) => void;
  onSetCurrent: (n: number) => void;
  onSetTemp: (n: number) => void;
  onClose: () => void;
}

function haptic() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(10);
  }
}

const MAX_DIGITS = 4;

/**
 * Number-first quick-entry keypad. Type an amount, then commit it as Damage,
 * Heal, Set (current), or Temp. Presentational — every action flows out via a
 * callback; the store owns the rules (heal caps, temp drains first, death saves).
 */
export function HpKeypad({
  current, max, temp, onDamage, onHeal, onSetCurrent, onSetTemp, onClose,
}: HpKeypadProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [digits, setDigits] = useState("");
  const amount = digits === "" ? 0 : parseInt(digits, 10);
  const hasAmount = amount > 0;

  const push = (d: string) => {
    haptic();
    setDigits((cur) => (cur === "0" ? d : (cur + d).slice(0, MAX_DIGITS)));
  };
  const back = () => { haptic(); setDigits((cur) => cur.slice(0, -1)); };
  const clear = () => { haptic(); setDigits(""); };
  const commit = (fn: (n: number) => void) => {
    if (!hasAmount) return;
    haptic();
    fn(amount);
    onClose();
  };

  // Escape closes; hardware digits / Backspace / Enter(=Heal) also drive it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onCloseRef.current();
      if (e.key >= "0" && e.key <= "9") return push(e.key);
      if (e.key === "Backspace") return back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pads = ["1","2","3","4","5","6","7","8","9"];
  return (
    <div className="hp-editor" data-testid="keypad-backdrop" onClick={onClose}>
      <div
        ref={sheetRef}
        className="hp-editor__sheet keypad"
        role="dialog"
        aria-modal="true"
        aria-label="Apply amount to HP"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="keypad__amount" data-testid="keypad-amount" aria-live="polite">
          {amount}
        </div>
        <div className="keypad__context">
          current {current} / {max}{temp > 0 ? ` · +${temp} temp` : ""}
        </div>

        <div className="keypad__pad">
          {pads.map((d) => (
            <button key={d} type="button" className="keypad__key" onClick={() => push(d)}>
              {d}
            </button>
          ))}
          <button type="button" className="keypad__key keypad__key--muted" aria-label="Clear" onClick={clear}>C</button>
          <button type="button" className="keypad__key" onClick={() => push("0")}>0</button>
          <button type="button" className="keypad__key keypad__key--muted" aria-label="Backspace" onClick={back}>⌫</button>
        </div>

        <div className="keypad__actions">
          <button type="button" className="keypad__apply" data-kind="damage" disabled={!hasAmount} onClick={() => commit(onDamage)}>– Damage</button>
          <button type="button" className="keypad__apply" data-kind="heal" disabled={!hasAmount} onClick={() => commit(onHeal)}>+ Heal</button>
        </div>
        <div className="keypad__secondary">
          <button type="button" className="keypad__minor" disabled={!hasAmount} onClick={() => commit(onSetCurrent)}>Set to {amount}</button>
          <button type="button" className="keypad__minor" data-kind="temp" disabled={!hasAmount} onClick={() => commit(onSetTemp)}>Temp = {amount}</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `corepack pnpm exec vitest run src/ui/HpKeypad.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/HpKeypad.tsx src/ui/HpKeypad.test.tsx
git commit -m "feat(ui): number-first HpKeypad component (US-1, US-5)"
```

---

## Task 3: `UndoPill` component

**Files:**
- Create: `src/ui/UndoPill.tsx`
- Test: `src/ui/UndoPill.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/ui/UndoPill.test.tsx`:

```tsx
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UndoPill } from "./UndoPill";

describe("UndoPill", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders the label and reverts on tap", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onUndo = vi.fn(), onDismiss = vi.fn();
    render(<UndoPill label="Healed +9" onUndo={onUndo} onDismiss={onDismiss} />);
    expect(screen.getByText("Healed +9")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /undo/i }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it("auto-dismisses after the timeout", () => {
    const onDismiss = vi.fn();
    render(<UndoPill label="Took 6" onUndo={vi.fn()} onDismiss={onDismiss} />);
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(4000); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `corepack pnpm exec vitest run src/ui/UndoPill.test.tsx`
Expected: FAIL — cannot find module `./UndoPill`.

- [ ] **Step 3: Implement `UndoPill.tsx`**

Create `src/ui/UndoPill.tsx`:

```tsx
import { useEffect } from "react";

export interface UndoPillProps {
  label: string;
  onUndo: () => void;
  onDismiss: () => void;
  /** auto-dismiss delay (ms) */
  timeout?: number;
}

/** A transient pill announcing the last HP change with a single Undo. */
export function UndoPill({ label, onUndo, onDismiss, timeout = 4000 }: UndoPillProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, timeout);
    return () => clearTimeout(t);
  }, [label, onDismiss, timeout]);

  return (
    <div className="undo-pill" role="status">
      <span className="undo-pill__label">{label}</span>
      <button type="button" className="undo-pill__btn" onClick={onUndo}>↶ Undo</button>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `corepack pnpm exec vitest run src/ui/UndoPill.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/UndoPill.tsx src/ui/UndoPill.test.tsx
git commit -m "feat(ui): transient UndoPill component (US-2)"
```

---

## Task 4: Keypad + pill styles

**Files:**
- Modify: `src/styles.css`

No test (pure CSS — verified visually in Task 6). Reuses the existing `.hp-editor`/`.hp-editor__sheet` backdrop+sheet tokens (the keypad sets `className="hp-editor__sheet keypad"`), so only the keypad-specific grid and the pill need new rules.

- [ ] **Step 1: Append keypad + pill styles**

Add to the end of `src/styles.css`:

```css
/* ── Quick-entry keypad ─────────────────────────────────────────────────── */
.keypad { width: min(100%, 22rem); gap: 0.5rem; display: flex; flex-direction: column; }
.keypad__amount {
  text-align: center; font-size: clamp(2.4rem, 12vw, 3.2rem); font-weight: 800;
  font-variant-numeric: tabular-nums; color: var(--ink-100); line-height: 1;
}
.keypad__context { text-align: center; font-size: 0.8rem; color: var(--hp-temp); }
.keypad__pad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-top: 0.25rem; }
.keypad__key {
  appearance: none; border: 1px solid var(--obsidian-600); background: var(--obsidian-700);
  color: var(--ink-100); font-size: 1.4rem; font-weight: 600; border-radius: 14px;
  min-height: clamp(44px, 7svh, 60px); cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.keypad__key:active { transform: scale(0.94); }
.keypad__key--muted { color: var(--ink-300); font-size: 1.1rem; }
.keypad__actions, .keypad__secondary { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.keypad__apply {
  appearance: none; border: none; border-radius: 14px; font-weight: 800; font-size: 1.05rem;
  min-height: clamp(46px, 7svh, 58px); cursor: pointer; color: #fff;
}
.keypad__apply[data-kind="damage"] { background: color-mix(in oklab, var(--hp-critical) 75%, black); }
.keypad__apply[data-kind="heal"] { background: var(--hp-healthy); color: #06281f; }
.keypad__apply:disabled { opacity: 0.4; }
.keypad__minor {
  appearance: none; background: none; border: 1px solid var(--obsidian-600); border-radius: 12px;
  color: var(--ink-200); font-weight: 700; min-height: 40px; cursor: pointer;
}
.keypad__minor[data-kind="temp"] { color: var(--hp-temp); border-color: color-mix(in oklab, var(--hp-temp) 30%, var(--obsidian-600)); }
.keypad__minor:disabled { opacity: 0.4; }

/* ── Undo pill ──────────────────────────────────────────────────────────── */
.undo-pill {
  position: fixed; left: 50%; transform: translateX(-50%);
  bottom: calc(env(safe-area-inset-bottom) + 0.75rem); z-index: 20;
  display: inline-flex; align-items: center; gap: 0.75rem;
  background: var(--obsidian-700); border: 1px solid var(--obsidian-600);
  border-radius: 999px; padding: 0.5rem 0.9rem; box-shadow: 0 8px 22px rgba(0,0,0,0.45);
  animation: undo-pill-in var(--dur-fast) var(--ease-spring);
}
@keyframes undo-pill-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
.undo-pill__label { font-size: 0.85rem; color: var(--ink-200); }
.undo-pill__btn { appearance: none; background: none; border: none; color: var(--hp-temp); font-weight: 800; font-size: 0.85rem; cursor: pointer; }
```

- [ ] **Step 2: Verify the build**

Run: `corepack pnpm build`
Expected: build OK.

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "style: quick-entry keypad + undo pill"
```

---

## Task 5: Wire into `App`

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write the failing integration tests**

Add to `src/App.test.tsx` (inside the existing `describe("App (integration)")`):

```tsx
it("opens the keypad from the HP number and applies typed damage", async () => {
  render(<App />);
  await screen.findByText("10");
  await userEvent.click(screen.getByRole("button", { name: /edit current hp/i }));
  const dialog = await screen.findByRole("dialog", { name: /amount|hp/i });
  expect(dialog).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "6" }));
  await userEvent.click(screen.getByRole("button", { name: /^damage/i }));
  expect(await screen.findByText("4")).toBeInTheDocument(); // 10 - 6
  await waitFor(() => expect(screen.queryByRole("dialog", { name: /amount|hp/i })).not.toBeInTheDocument());
});

it("shows an Undo pill after a change and reverts it", async () => {
  render(<App />);
  await screen.findByText("10");
  await userEvent.click(screen.getByRole("button", { name: /edit current hp/i }));
  await userEvent.click(screen.getByRole("button", { name: "6" }));
  await userEvent.click(screen.getByRole("button", { name: /^damage/i }));
  await screen.findByText("4");
  await userEvent.click(await screen.findByRole("button", { name: /undo/i }));
  expect(await screen.findByText("10")).toBeInTheDocument();
});

it("still opens the set-max editor from the /max number", async () => {
  render(<App />);
  await screen.findByText("10");
  await userEvent.click(screen.getByRole("button", { name: /edit maximum hp/i }));
  expect(await screen.findByRole("dialog", { name: /set max hp/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `corepack pnpm exec vitest run src/App.test.tsx -t "keypad|Undo pill|set-max"`
Expected: FAIL — tapping current HP opens the old set editor, no keypad dialog.

- [ ] **Step 3: Wire the keypad, pill, and max editor in `App.tsx`**

Add imports:

```tsx
import { HpKeypad } from "./ui/HpKeypad";
import { UndoPill } from "./ui/UndoPill";
```

Replace the `EditTarget` type and `editing` state with a max-only editor flag plus keypad state:

```tsx
const [editingMax, setEditingMax] = useState(false);
const [keypadOpen, setKeypadOpen] = useState(false);
```

(Delete the old `type EditTarget`, the `editing` state, the `editors` record, and the `active` derivation — they are replaced below.)

Point the vessel's callbacks at the keypad (current + temp) and the max editor:

```tsx
<LiquidVessel
  current={current}
  max={max}
  temp={temp}
  onEditCurrent={() => setKeypadOpen(true)}
  onEditMax={() => setEditingMax(true)}
  onEditTemp={() => setKeypadOpen(true)}
/>
```

Build the undo-pill label from `hp.lastChange`:

```tsx
const undoLabel = (lc: NonNullable<typeof hp.lastChange>) =>
  lc.kind === "damage" ? `Took ${lc.amount}`
  : lc.kind === "heal" ? `Healed +${lc.amount}`
  : lc.kind === "temp" ? `Temp ${lc.amount}`
  : `Set to ${lc.amount}`;
```

Replace the trailing `{active && (<HpValueEditor … />)}` block with the keypad, the max editor, and the pill:

```tsx
{keypadOpen && (
  <HpKeypad
    current={current}
    max={max}
    temp={temp}
    onDamage={(n) => { playSfx("damage"); return hp.damage(n); }}
    onHeal={(n) => { playSfx("heal"); return hp.heal(n); }}
    onSetCurrent={hp.setCurrent}
    onSetTemp={hp.setTempValue}
    onClose={() => setKeypadOpen(false)}
  />
)}

{editingMax && (
  <HpValueEditor
    label="Max HP"
    value={max}
    onDecrement={() => hp.stepMax(-1)}
    onIncrement={() => hp.stepMax(1)}
    onSet={hp.setMax}
    onClose={() => setEditingMax(false)}
  />
)}

{hp.lastChange && (
  <UndoPill
    label={undoLabel(hp.lastChange)}
    onUndo={hp.undo}
    onDismiss={hp.dismissLastChange}
  />
)}
```

`onUndo` reverts (and clears) the change; `onDismiss` (timeout) clears it without reverting — both defined on `useHp` in Task 1.

- [ ] **Step 4: Run the integration tests + full suite**

Run: `corepack pnpm exec vitest run src/App.test.tsx`
Expected: PASS (new + existing App tests).
Run: `corepack pnpm test`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/store/useHp.ts src/store/useHp.test.ts
git commit -m "feat: wire quick-entry keypad + undo pill into the app (US-1, US-2, US-5)"
```

---

## Task 6: Full gate + on-device verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full gate**

```bash
corepack pnpm lint && corepack pnpm typecheck && corepack pnpm test && corepack pnpm build
```
Expected: all green.

- [ ] **Step 2: Drive the real app (Playwright, optional but recommended)**

Start a preview (`corepack pnpm preview --port 4173`) and confirm by hand or with a Playwright script: tapping the HP number opens the keypad; typing `9` + Heal raises HP (capped at max) and closes the sheet; the orb sloshes; the Undo pill appears and reverts; tapping `/max` still opens the set-max editor. Capture a screenshot of the open keypad.

- [ ] **Step 3: Open the PR to `beta`**

Push the branch and open a PR into `beta` titled `feat: quick damage/heal keypad + undo (US-1/US-2/US-5)`. Summarize the design decisions, link the spec, and note it needs an on-device check (touch interaction). Address bot review findings in-thread.

---

## Self-Review

**Spec coverage:**
- US-1 quick damage/heal entry → Task 2 (keypad Damage/Heal) + Task 5 (wiring). ✅
- US-2 undo → Task 1 (`undo`/`lastChange`) + Task 3 (pill) + Task 5 (render). ✅
- US-5 temp via keypad → Task 2 (`Temp = N` → `onSetTemp`) + Task 5 (`hp.setTempValue`). ✅
- Number-first, tap-to-open, close-on-apply, steppers unchanged, max stays on editor → Tasks 2 & 5. ✅
- No new game rules (reuse useHp) → Tasks 2 & 5 call existing actions. ✅

**Placeholder scan:** none — every code step shows full content.

**Type consistency:** `HpLastChange` (kind/amount/before) defined in Task 1 and consumed identically in Task 5's `undoLabel`. `HpKeypad`/`UndoPill` prop names match between component, tests, and the App wiring. `dismissLastChange` is called out in Task 1 and Task 5. `onSetCurrent`/`onSetTemp` map to `hp.setCurrent`/`hp.setTempValue`.
