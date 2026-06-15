# Coin / Currency Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track GP/SP/CP coin behind a button in the top chrome — a bottom sheet with three rows and a live total-in-gold, where tapping a row opens the existing number-first keypad (Add/Spend/Set).

**Architecture:** Mirror the HP stack: a pure `domain/coins.ts`, a `useCoins` store hook over the same Dexie record, and presentational UI (`CoinButton`, `CoinSheet`). The keypad is generalised from `HpKeypad` into `AmountKeypad` so HP and coins share one component.

**Tech Stack:** React 19 + TypeScript, Vite, vitest + @testing-library/react + user-event, Dexie. Commands: `corepack pnpm ...`.

**Spec:** `docs/superpowers/specs/2026-06-15-coin-tracker-design.md`

---

## File Structure

- `src/domain/coins.ts` (create) — pure coin math.
- `src/domain/coins.test.ts` (create).
- `src/store/db.ts` (modify) — add `gp/sp/cp` to `HpRecord` + `SEED`.
- `src/store/useCoins.ts` (create) — reactive coin state + actions.
- `src/store/useCoins.test.ts` (create).
- `src/ui/AmountKeypad.tsx` (create) — generic keypad extracted from HpKeypad.
- `src/ui/AmountKeypad.test.tsx` (create).
- `src/ui/HpKeypad.tsx` (modify) — becomes a thin wrapper over `AmountKeypad`.
- `src/ui/CoinSheet.tsx` (create) — the coin bottom sheet.
- `src/ui/CoinSheet.test.tsx` (create).
- `src/ui/CoinButton.tsx` (create) — the `¢` chrome trigger.
- `src/App.tsx` (modify) — render button + sheet; mutual exclusion with other modals.
- `src/App.test.tsx` (modify) — integration test.
- `src/styles.css` (modify) — coin sheet/row/button styles.

---

## Task 1: `domain/coins.ts` (pure coin math)

**Files:** Create `src/domain/coins.ts`, `src/domain/coins.test.ts`.

- [ ] **Step 1: Write the failing tests** — `src/domain/coins.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { addCoin, type Coins, setCoin, spendCoin, totalGp } from "./coins";

const C = (gp: number, sp: number, cp: number): Coins => ({ gp, sp, cp });

describe("coins", () => {
  it("adds to a denomination, leaving others untouched", () => {
    expect(addCoin(C(5, 0, 0), "gp", 7)).toEqual(C(12, 0, 0));
    expect(addCoin(C(0, 3, 0), "sp", 2)).toEqual(C(0, 5, 0));
  });

  it("spends, clamping at zero (never negative)", () => {
    expect(spendCoin(C(10, 0, 0), "gp", 4)).toEqual(C(6, 0, 0));
    expect(spendCoin(C(3, 0, 0), "gp", 10)).toEqual(C(0, 0, 0));
  });

  it("sets a denomination to an exact non-negative integer", () => {
    expect(setCoin(C(1, 2, 3), "sp", 9)).toEqual(C(1, 9, 3));
    expect(setCoin(C(1, 2, 3), "cp", -5)).toEqual(C(1, 2, 0));
    expect(setCoin(C(1, 2, 3), "gp", 4.7)).toEqual(C(4, 2, 3));
  });

  it("computes the total in gold (10sp = 1gp, 100cp = 1gp)", () => {
    expect(totalGp(C(41, 12, 30))).toBeCloseTo(41 + 1.2 + 0.3, 5); // 42.5
    expect(totalGp(C(0, 0, 0))).toBe(0);
  });

  it("is pure — does not mutate its input", () => {
    const c = C(1, 1, 1);
    addCoin(c, "gp", 5);
    expect(c).toEqual(C(1, 1, 1));
  });
});
```

- [ ] **Step 2: Run to verify FAIL** — `corepack pnpm exec vitest run src/domain/coins.test.ts` → cannot find module.

- [ ] **Step 3: Implement** — `src/domain/coins.ts`:

```ts
/** Pure coin math for the three tracked denominations. Integer counts, never
 * negative. No I/O — mirrors the other domain modules. */

export type CoinKind = "gp" | "sp" | "cp";
export interface Coins {
  gp: number;
  sp: number;
  cp: number;
}

const norm = (n: number) => Math.max(0, Math.trunc(n));

export function addCoin(c: Coins, kind: CoinKind, n: number): Coins {
  return { ...c, [kind]: norm(c[kind] + Math.trunc(n)) };
}

export function spendCoin(c: Coins, kind: CoinKind, n: number): Coins {
  return { ...c, [kind]: norm(c[kind] - Math.trunc(n)) };
}

export function setCoin(c: Coins, kind: CoinKind, n: number): Coins {
  return { ...c, [kind]: norm(n) };
}

/** Total wealth expressed in gold: 10 sp = 1 gp, 100 cp = 1 gp. */
export function totalGp(c: Coins): number {
  return c.gp + c.sp / 10 + c.cp / 100;
}
```

- [ ] **Step 4: Run to verify PASS** — `corepack pnpm exec vitest run src/domain/coins.test.ts`.

- [ ] **Step 5: Commit**
```bash
git add src/domain/coins.ts src/domain/coins.test.ts
git commit -m "feat(domain): pure coin math (add/spend/set/totalGp) (#23)"
```

---

## Task 2: coin fields on the record + `useCoins` hook

**Files:** Modify `src/store/db.ts`; create `src/store/useCoins.ts`, `src/store/useCoins.test.ts`.

- [ ] **Step 1: Write the failing tests** — `src/store/useCoins.test.ts`:

```ts
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHpDb, type HpDb } from "./db";
import { useCoins } from "./useCoins";

const DB_NAME = "hoard-hp-coins-test";
let db: HpDb;
beforeEach(async () => { await Dexie.delete(DB_NAME); db = createHpDb(DB_NAME); });
afterEach(() => db.close());

describe("useCoins", () => {
  it("defaults all denominations to 0", async () => {
    const { result } = renderHook(() => useCoins(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect([result.current.gp, result.current.sp, result.current.cp]).toEqual([0, 0, 0]);
    expect(result.current.total).toBe(0);
  });

  it("adds, spends (clamped), sets, and tracks the gold total", async () => {
    const { result } = renderHook(() => useCoins(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.add("gp", 41));
    await act(() => result.current.add("sp", 12));
    await act(() => result.current.add("cp", 30));
    await waitFor(() => expect(result.current.gp).toBe(41));
    expect(result.current.total).toBeCloseTo(42.5, 5);
    await act(() => result.current.spend("gp", 100)); // clamps at 0
    await waitFor(() => expect(result.current.gp).toBe(0));
    await act(() => result.current.set("sp", 7));
    await waitFor(() => expect(result.current.sp).toBe(7));
  });
});
```

- [ ] **Step 2: Run to verify FAIL** — `corepack pnpm exec vitest run src/store/useCoins.test.ts`.

- [ ] **Step 3a: Add coin fields to the record** — in `src/store/db.ts`, add three fields to the `HpRecord` interface (after `temp`):
```ts
  /** Tracked coin (optional — absent on legacy records, read as 0). */
  gp?: number;
  sp?: number;
  cp?: number;
```
and to the `SEED` object (the first-run seed, alongside `temp: 0`):
```ts
  gp: 0,
  sp: 0,
  cp: 0,
```
No Dexie schema version bump — these fields are not indexed.

- [ ] **Step 3b: Implement `src/store/useCoins.ts`:**

```ts
import { useLiveQuery } from "dexie-react-hooks";
import { addCoin, type CoinKind, type Coins, setCoin, spendCoin, totalGp } from "../domain/coins";
import { db as defaultDb, HP_ID, type HpDb, type HpRecord, isReloading } from "./db";

export interface UseCoinsResult extends Coins {
  hydrated: boolean;
  total: number;
  add: (kind: CoinKind, n: number) => Promise<void>;
  spend: (kind: CoinKind, n: number) => Promise<void>;
  set: (kind: CoinKind, n: number) => Promise<void>;
}

const coinsOf = (r: HpRecord): Coins => ({ gp: r.gp ?? 0, sp: r.sp ?? 0, cp: r.cp ?? 0 });

/** Reactive coin state over the single persisted record. Reuses the same resilient
 * read-fresh-inside-txn write the HP hook uses, so rapid taps never clobber. */
export function useCoins(db: HpDb = defaultDb): UseCoinsResult {
  const record = useLiveQuery(() => db.hp.get(HP_ID), [db]);

  const write = (fn: (c: Coins) => Coins) => async (): Promise<void> => {
    const run = () =>
      db.transaction("rw", db.hp, async () => {
        const cur = await db.hp.get(HP_ID);
        if (!cur) return;
        await db.hp.put({ ...cur, ...fn(coinsOf(cur)) });
      });
    try {
      await run();
    } catch (err) {
      if (isReloading()) return;
      try {
        if (!db.isOpen()) await db.open();
        await run();
      } catch (err2) {
        console.error("[hoard] coin write failed; the change was not saved", err ?? err2);
      }
    }
  };

  const coins = record ? coinsOf(record) : { gp: 0, sp: 0, cp: 0 };
  return {
    ...coins,
    total: totalGp(coins),
    hydrated: record !== undefined,
    add: (kind, n) => write((c) => addCoin(c, kind, n))(),
    spend: (kind, n) => write((c) => spendCoin(c, kind, n))(),
    set: (kind, n) => write((c) => setCoin(c, kind, n))(),
  };
}
```

- [ ] **Step 4: Run to verify PASS** — `corepack pnpm exec vitest run src/store/useCoins.test.ts`, then `corepack pnpm exec vitest run src/store/` (the existing seed test asserts the seeded record — update it if it does an exact `toEqual`: add `gp: 0, sp: 0, cp: 0` to its expected object in `src/store/useHp.test.ts`). Run `corepack pnpm typecheck`.

- [ ] **Step 5: Commit**
```bash
git add src/store/db.ts src/store/useCoins.ts src/store/useCoins.test.ts src/store/useHp.test.ts
git commit -m "feat(store): coin fields + useCoins hook (#23)"
```

---

## Task 3: Generalise `HpKeypad` → `AmountKeypad` (behaviour-preserving)

**Files:** Create `src/ui/AmountKeypad.tsx`, `src/ui/AmountKeypad.test.tsx`; modify `src/ui/HpKeypad.tsx`.

**Why:** The coin sheet needs the same number-first keypad with different actions (Add/Spend/Set). Extract the keypad into `AmountKeypad` (digit pad + focus-trap + hardware keys + configurable action rows). `HpKeypad` becomes a thin wrapper. **The existing 17 `HpKeypad` tests are the safety net — they must stay green unchanged.**

- [ ] **Step 1: Create `src/ui/AmountKeypad.tsx`.** Move the entire current body of `src/ui/HpKeypad.tsx` (read it first) into this new component, parameterising the dialog label, the context line, the primary action row, and the secondary action row, and adding a `closeOnCommit` flag. Keep ALL class names, `data-testid`s, `aria-label`s, the focus-trap, hardware-key handling, `MAX_DIGITS`, and the `hasAmount`/`typed` gating EXACTLY as they are now:

```tsx
import { type ReactNode, useEffect, useRef, useState } from "react";

/** A commit action button. `gate: "positive"` disables it at 0 (maths-only actions);
 * `gate: "typed"` allows an explicit 0 (direct-set actions). `label` may use the amount. */
export interface KeypadAction {
  label: (amount: number) => ReactNode;
  ariaLabel?: string;
  /** maps to `data-kind` for colour (damage/heal/temp/add/spend), optional. */
  tone?: string;
  gate: "positive" | "typed";
  onCommit: (n: number) => void;
}

export interface AmountKeypadProps {
  /** Dialog aria-label, e.g. "Apply amount to HP" or "Gold coins". */
  ariaLabel: string;
  /** Context line under the amount (e.g. HP readout, or the coin name). */
  context: ReactNode;
  /** Big primary buttons (1–2). */
  primary: KeypadAction[];
  /** Optional minor buttons (0–2). */
  secondary?: KeypadAction[];
  /** Keep the sheet open after a commit (coins) instead of closing (HP). */
  closeOnCommit?: boolean;
  onClose: () => void;
}

function haptic() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(10);
}
const MAX_DIGITS = 4;

export function AmountKeypad({ ariaLabel, context, primary, secondary = [], closeOnCommit = true, onClose }: AmountKeypadProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [digits, setDigits] = useState("");
  const amount = digits === "" ? 0 : parseInt(digits, 10);
  const hasAmount = amount > 0;
  const typed = digits !== "";
  const ok = (a: KeypadAction) => (a.gate === "positive" ? hasAmount : typed);

  const push = (d: string) => { haptic(); setDigits((c) => (c === "0" ? d : (c + d).slice(0, MAX_DIGITS))); };
  const back = () => { haptic(); setDigits((c) => c.slice(0, -1)); };
  const clear = () => { haptic(); setDigits(""); };
  const commit = (a: KeypadAction) => {
    if (!ok(a)) return;
    haptic();
    a.onCommit(amount);
    if (closeOnCommit) onClose();
    else setDigits(""); // ready for the next entry
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onCloseRef.current();
      if (e.key >= "0" && e.key <= "9") return push(e.key);
      if (e.key === "Backspace") return back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    sheetRef.current
      ?.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')
      ?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const sheet = sheetRef.current;
      if (!sheet) return;
      const f = sheet.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
      const first = f[0], last = f[f.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (!sheet.contains(active)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pads = ["1","2","3","4","5","6","7","8","9"];
  return (
    <div className="hp-editor" data-testid="keypad-backdrop" onClick={onClose}>
      <div ref={sheetRef} className="hp-editor__sheet keypad" role="dialog" aria-modal="true" aria-label={ariaLabel} onClick={(e) => e.stopPropagation()}>
        <div className="keypad__amount" data-testid="keypad-amount" aria-live="polite">{amount}</div>
        <div className="keypad__context">{context}</div>
        <div className="keypad__pad">
          {pads.map((d) => (<button key={d} type="button" className="keypad__key" onClick={() => push(d)}>{d}</button>))}
          <button type="button" className="keypad__key keypad__key--muted" aria-label="Clear" onClick={clear}>C</button>
          <button type="button" className="keypad__key" onClick={() => push("0")}>0</button>
          <button type="button" className="keypad__key keypad__key--muted" aria-label="Backspace" onClick={back}>⌫</button>
        </div>
        <div className="keypad__actions">
          {primary.map((a, i) => (
            <button key={i} type="button" className="keypad__apply" data-kind={a.tone} aria-label={a.ariaLabel} disabled={!ok(a)} onClick={() => commit(a)}>{a.label(amount)}</button>
          ))}
        </div>
        {secondary.length > 0 && (
          <div className="keypad__secondary">
            {secondary.map((a, i) => (
              <button key={i} type="button" className="keypad__minor" data-kind={a.tone} disabled={!ok(a)} onClick={() => commit(a)}>{a.label(amount)}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Refactor `src/ui/HpKeypad.tsx` to render `AmountKeypad`** — keep `HpKeypadProps` identical; map to actions so the rendered markup matches the old output (Damage/Heal primary, "Set to N"/"Temp = N" secondary):

```tsx
import { AmountKeypad } from "./AmountKeypad";

export interface HpKeypadProps {
  current: number; max: number; temp: number;
  onDamage: (n: number) => void; onHeal: (n: number) => void;
  onSetCurrent: (n: number) => void; onSetTemp: (n: number) => void;
  onClose: () => void;
}

export function HpKeypad({ current, max, temp, onDamage, onHeal, onSetCurrent, onSetTemp, onClose }: HpKeypadProps) {
  return (
    <AmountKeypad
      ariaLabel="Apply amount to HP"
      context={<>current {current} / {max}{temp > 0 ? ` · +${temp} temp` : ""}</>}
      primary={[
        { label: () => "– Damage", ariaLabel: "Damage", tone: "damage", gate: "positive", onCommit: onDamage },
        { label: () => "+ Heal", ariaLabel: "Heal", tone: "heal", gate: "positive", onCommit: onHeal },
      ]}
      secondary={[
        { label: (n) => `Set to ${n}`, gate: "typed", onCommit: onSetCurrent },
        { label: (n) => `Temp = ${n}`, tone: "temp", gate: "typed", onCommit: onSetTemp },
      ]}
      onClose={onClose}
    />
  );
}
```

- [ ] **Step 3: Run the existing keypad tests UNCHANGED to verify GREEN** — `corepack pnpm exec vitest run src/ui/HpKeypad.test.tsx`. Expected: all 17 pass with no edits. If any fail, the refactor changed observable markup — fix `AmountKeypad`/the wrapper until the markup matches exactly. Do NOT edit `HpKeypad.test.tsx`.

- [ ] **Step 4: Add `AmountKeypad`-specific tests** — `src/ui/AmountKeypad.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AmountKeypad } from "./AmountKeypad";

const tap = (n: string | RegExp) => userEvent.click(screen.getByRole("button", { name: n }));

describe("AmountKeypad", () => {
  it("renders the configured actions and commits the typed amount", async () => {
    const add = vi.fn(), onClose = vi.fn();
    render(<AmountKeypad ariaLabel="Gold coins" context="Gold" closeOnCommit={false}
      primary={[{ label: () => "Add", ariaLabel: "Add", tone: "add", gate: "positive", onCommit: add }]} onClose={onClose} />);
    await tap("9"); await tap(/^add$/i);
    expect(add).toHaveBeenCalledWith(9);
  });

  it("keeps the sheet open and resets the amount when closeOnCommit is false", async () => {
    const add = vi.fn(), onClose = vi.fn();
    render(<AmountKeypad ariaLabel="Gold coins" context="Gold" closeOnCommit={false}
      primary={[{ label: () => "Add", ariaLabel: "Add", gate: "positive", onCommit: add }]} onClose={onClose} />);
    await tap("5"); await tap(/^add$/i);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId("keypad-amount")).toHaveTextContent("0"); // reset for next entry
  });

  it("closes after commit when closeOnCommit is true", async () => {
    const add = vi.fn(), onClose = vi.fn();
    render(<AmountKeypad ariaLabel="x" context="x" closeOnCommit
      primary={[{ label: () => "Add", ariaLabel: "Add", gate: "positive", onCommit: add }]} onClose={onClose} />);
    await tap("3"); await tap(/^add$/i);
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Run all keypad tests + typecheck + lint** — `corepack pnpm exec vitest run src/ui/HpKeypad.test.tsx src/ui/AmountKeypad.test.tsx`, `corepack pnpm typecheck`, `corepack pnpm lint`. All green.

- [ ] **Step 6: Commit**
```bash
git add src/ui/AmountKeypad.tsx src/ui/AmountKeypad.test.tsx src/ui/HpKeypad.tsx
git commit -m "refactor(ui): extract AmountKeypad from HpKeypad (closeOnCommit, configurable actions) (#23)"
```

---

## Task 4: `CoinSheet` + `CoinButton`

**Files:** Create `src/ui/CoinSheet.tsx`, `src/ui/CoinSheet.test.tsx`, `src/ui/CoinButton.tsx`.

- [ ] **Step 1: Write the failing test** — `src/ui/CoinSheet.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CoinSheet } from "./CoinSheet";

function setup(over = {}) {
  const props = { gp: 41, sp: 12, cp: 30, total: 42.5, onAdd: vi.fn(), onSpend: vi.fn(), onSet: vi.fn(), onClose: vi.fn(), ...over };
  render(<CoinSheet {...props} />);
  return props;
}

describe("CoinSheet", () => {
  it("shows the three denominations and the gold total", () => {
    setup();
    expect(screen.getByRole("dialog", { name: /coins/i })).toBeInTheDocument();
    expect(screen.getByText(/42\.5/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /gold/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /silver/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copper/i })).toBeInTheDocument();
  });

  it("opens the keypad for a denomination and adds the typed amount", async () => {
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: /gold/i }));
    await userEvent.click(screen.getByRole("button", { name: "7" }));
    await userEvent.click(screen.getByRole("button", { name: /^add$/i }));
    expect(p.onAdd).toHaveBeenCalledWith("gp", 7);
  });

  it("spends from a denomination", async () => {
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: /silver/i }));
    await userEvent.click(screen.getByRole("button", { name: "3" }));
    await userEvent.click(screen.getByRole("button", { name: /^spend$/i }));
    expect(p.onSpend).toHaveBeenCalledWith("sp", 3);
  });

  it("closes on backdrop click", async () => {
    const p = setup();
    await userEvent.click(screen.getByTestId("coin-backdrop"));
    expect(p.onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify FAIL** — `corepack pnpm exec vitest run src/ui/CoinSheet.test.tsx`.

- [ ] **Step 3a: Implement `src/ui/CoinSheet.tsx`:**

```tsx
import { useState } from "react";
import type { CoinKind } from "../domain/coins";
import { AmountKeypad } from "./AmountKeypad";

export interface CoinSheetProps {
  gp: number; sp: number; cp: number; total: number;
  onAdd: (kind: CoinKind, n: number) => void;
  onSpend: (kind: CoinKind, n: number) => void;
  onSet: (kind: CoinKind, n: number) => void;
  onClose: () => void;
}

const ROWS: { kind: CoinKind; label: string; unit: string }[] = [
  { kind: "gp", label: "Gold", unit: "gp" },
  { kind: "sp", label: "Silver", unit: "sp" },
  { kind: "cp", label: "Copper", unit: "cp" },
];

/** Bottom-sheet coin tracker. Rows show the three counts; tapping one opens the
 * shared keypad (Add/Spend/Set) for that denomination. Presentational. */
export function CoinSheet({ gp, sp, cp, total, onAdd, onSpend, onSet, onClose }: CoinSheetProps) {
  const counts: Record<CoinKind, number> = { gp, sp, cp };
  const [editing, setEditing] = useState<CoinKind | null>(null);

  if (editing) {
    const row = ROWS.find((r) => r.kind === editing)!;
    return (
      <AmountKeypad
        ariaLabel={`${row.label} coins`}
        context={`${row.label} — ${counts[editing]} ${row.unit}`}
        closeOnCommit={false}
        primary={[
          { label: () => "Add", ariaLabel: "Add", tone: "add", gate: "positive", onCommit: (n) => onAdd(editing, n) },
          { label: () => "Spend", ariaLabel: "Spend", tone: "spend", gate: "positive", onCommit: (n) => onSpend(editing, n) },
        ]}
        secondary={[{ label: (n) => `Set to ${n}`, gate: "typed", onCommit: (n) => onSet(editing, n) }]}
        onClose={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="hp-editor" data-testid="coin-backdrop" onClick={onClose}>
      <div className="hp-editor__sheet coins" role="dialog" aria-modal="true" aria-label="Coins" onClick={(e) => e.stopPropagation()}>
        <div className="coins__head">
          <span className="coins__label">COINS</span>
          <span className="coins__total">≈ {total.toFixed(2).replace(/\.?0+$/, "")} gp</span>
        </div>
        {ROWS.map((r) => (
          <button key={r.kind} type="button" className="coins__row" data-kind={r.kind} aria-label={`${r.label} — ${counts[r.kind]} ${r.unit}, edit`} onClick={() => setEditing(r.kind)}>
            <span className="coins__name"><span className="coins__dot" /> {r.label} <span className="coins__unit">{r.unit}</span></span>
            <span className="coins__count">{counts[r.kind]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3b: Implement `src/ui/CoinButton.tsx`:**

```tsx
export interface CoinButtonProps {
  onOpen: () => void;
}

/** The ¢ trigger in the top chrome that opens the coin sheet. */
export function CoinButton({ onOpen }: CoinButtonProps) {
  return (
    <button type="button" className="coin-button" aria-label="Coins" onClick={onOpen}>
      ¢
    </button>
  );
}
```

- [ ] **Step 4: Run to verify PASS** — `corepack pnpm exec vitest run src/ui/CoinSheet.test.tsx`, `corepack pnpm typecheck`.

- [ ] **Step 5: Commit**
```bash
git add src/ui/CoinSheet.tsx src/ui/CoinSheet.test.tsx src/ui/CoinButton.tsx
git commit -m "feat(ui): CoinSheet + CoinButton (#23)"
```

---

## Task 5: wire into `App`

**Files:** Modify `src/App.tsx`, `src/App.test.tsx`.

- [ ] **Step 1: Write the failing integration test** — add to `src/App.test.tsx` inside `describe("App (integration)")`:

```tsx
it("opens the coin sheet from the chrome and adds gold", async () => {
  render(<App />);
  await screen.findByText("10");
  await userEvent.click(screen.getByRole("button", { name: /^coins$/i }));
  expect(await screen.findByRole("dialog", { name: /coins/i })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /gold/i }));
  await userEvent.click(screen.getByRole("button", { name: "8" }));
  await userEvent.click(screen.getByRole("button", { name: /^add$/i }));
  // back on the rows, the gold count reflects +8 (seed 0 → 8)
  await waitFor(() => expect(screen.getByRole("button", { name: /gold — 8 gp/i })).toBeInTheDocument());
});
```

- [ ] **Step 2: Run to verify FAIL** — `corepack pnpm exec vitest run src/App.test.tsx -t "coin sheet"`.

- [ ] **Step 3: Wire `App.tsx`.** Add imports:
```tsx
import { CoinButton } from "./ui/CoinButton";
import { CoinSheet } from "./ui/CoinSheet";
import { useCoins } from "./store/useCoins";
```
Inside the component, add the hook + open state (near the other `useState`s):
```tsx
const coins = useCoins();
const [coinsOpen, setCoinsOpen] = useState(false);
```
In `.hp-tracker__chrome` (which currently holds `<SoundToggle />`), add the coin button before/after it:
```tsx
<div className="hp-tracker__chrome">
  <CoinButton onOpen={() => { setKeypadOpen(false); setEditingMax(false); setCoinsOpen(true); }} />
  <SoundToggle />
</div>
```
Render the sheet near the other modals (and make the HP modals close it too — add `setCoinsOpen(false)` to the `onEditCurrent`/`onEditTemp`/`onEditMax` handlers so only one modal is open):
```tsx
{coinsOpen && (
  <CoinSheet
    gp={coins.gp} sp={coins.sp} cp={coins.cp} total={coins.total}
    onAdd={coins.add} onSpend={coins.spend} onSet={coins.set}
    onClose={() => setCoinsOpen(false)}
  />
)}
```

- [ ] **Step 4: Run GREEN** — `corepack pnpm exec vitest run src/App.test.tsx`, then `corepack pnpm test`, `corepack pnpm typecheck`, `corepack pnpm lint`. All green.

- [ ] **Step 5: Commit**
```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: wire coin button + sheet into the app (#23)"
```

---

## Task 6: coin styles

**Files:** Modify `src/styles.css`. No test (visual — verified in Task 7).

- [ ] **Step 1: Append styles** to `src/styles.css`:

```css
/* ── Coin button (chrome) ───────────────────────────────────────────────── */
.coin-button {
  appearance: none; width: 38px; height: 38px; border-radius: 50%;
  background: var(--obsidian-700); border: 1px solid var(--obsidian-600);
  color: #e8c763; font-weight: 800; font-size: 1.1rem; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.coin-button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* ── Coin sheet ─────────────────────────────────────────────────────────── */
.coins { width: min(100%, 23rem); display: flex; flex-direction: column; gap: 0.5rem; align-items: stretch; }
.coins__head { display: flex; justify-content: space-between; align-items: baseline; }
.coins__label { font-size: 0.72rem; letter-spacing: 0.14em; color: var(--ink-300); }
.coins__total { font-size: 0.95rem; font-weight: 700; color: #e8c763; }
.coins__row {
  appearance: none; display: flex; align-items: center; justify-content: space-between;
  width: 100%; padding: 0.9rem 0.85rem; border-radius: 14px;
  background: var(--obsidian-700); border: 1px solid var(--obsidian-600);
  color: var(--ink-100); cursor: pointer; min-height: 56px; -webkit-tap-highlight-color: transparent;
}
.coins__row:active { transform: scale(0.99); }
.coins__row:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.coins__name { display: flex; align-items: center; gap: 0.55rem; font-weight: 700; }
.coins__unit { color: var(--ink-300); font-size: 0.8rem; font-weight: 500; }
.coins__count { font-size: 1.4rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.coins__dot { width: 22px; height: 22px; border-radius: 50%; display: inline-block; }
.coins__row[data-kind="gp"] .coins__dot { background: #e8c763; }
.coins__row[data-kind="sp"] .coins__dot { background: #cbd5d1; }
.coins__row[data-kind="cp"] .coins__dot { background: #c47a4a; }

/* Add/Spend keypad tones reuse the keypad apply buttons. */
.keypad__apply[data-kind="add"] { background: var(--hp-healthy); color: #06281f; }
.keypad__apply[data-kind="spend"] { background: color-mix(in oklab, var(--hp-critical) 75%, black); color: #fff; }
```

- [ ] **Step 2: Build** — `corepack pnpm build` (green), then commit:
```bash
git add src/styles.css
git commit -m "style: coin button + sheet (#23)"
```

---

## Task 7: full gate + on-device verification + PR

**Files:** none.

- [ ] **Step 1: Full gate** — `corepack pnpm lint && corepack pnpm typecheck && corepack pnpm test && corepack pnpm build`. All green.

- [ ] **Step 2: Drive the real app (Playwright).** Start `corepack pnpm preview --port 4173`; confirm by hand or script: the ¢ button opens the sheet; tapping Gold → keypad → `8` + Add raises Gold to 8 and the total updates; Spend clamps at 0; backdrop closes. Capture a screenshot of the open sheet.

- [ ] **Step 3: Open the PR to `beta`** titled `feat: coin/currency tracker (GP/SP/CP) (#23)`. Summarise the decisions, link the spec, note the keypad was generalised (HpKeypad tests unchanged), and that it needs an on-device check. Address bot review findings in-thread.

---

## Self-Review

**Spec coverage:** three denominations (Task 1/2/4 ROWS) ✅; keypad Add/Spend/Set (Task 3/4) ✅; total-in-gold (Task 1 totalGp, Task 4 header) ✅; ¢ button in chrome (Task 4/5) ✅; same Dexie record, no migration (Task 2) ✅; off the HP page / mutual-exclusive modals (Task 5) ✅; no conversion (not built) ✅.

**Placeholder scan:** every code step is complete; Task 3 Step 1 says "move the current HpKeypad body" but provides the full target `AmountKeypad` source, so it's not a placeholder.

**Type consistency:** `CoinKind`/`Coins` defined in Task 1 used identically in Task 2 (`useCoins`) and Task 4 (`CoinSheet`). `KeypadAction`/`AmountKeypadProps` defined in Task 3 used in Task 4. `useCoins` returns `{gp,sp,cp,total,add,spend,set,hydrated}` — consumed exactly in Task 5. The `data-kind` tones (`add`/`spend`) defined in Task 4 are styled in Task 6.
