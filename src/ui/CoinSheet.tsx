import { useEffect, useRef, useState } from "react";
import { type CoinKind, type Coins, canSpend, coinsEqual, distill } from "../domain/coins";
import { AmountKeypad } from "./AmountKeypad";
import { CoinRow } from "./CoinRow";
import { DistillConfirm } from "./DistillConfirm";
import { Glyph } from "./icons/Glyph";

export interface CoinSheetProps {
  pp: number;
  gp: number;
  sp: number;
  cp: number;
  total: number;
  onAdd: (kind: CoinKind, n: number) => void;
  onSpend: (kind: CoinKind, n: number) => void;
  onSet: (kind: CoinKind, n: number) => void;
  /** Collapse the purse into the fewest coins. */
  onDistill: () => void;
  /** The pre-distill purse, or null. When set, the footer offers an undo. */
  lastDistill: Coins | null;
  /** Revert the last distill. */
  onUndoDistill: () => void;
  /** Clear the distill-undo affordance without reverting. */
  onDismissDistill: () => void;
  onClose: () => void;
}

const ROWS: { kind: CoinKind; label: string; unit: string }[] = [
  { kind: "pp", label: "Platinum", unit: "pp" },
  { kind: "gp", label: "Gold", unit: "gp" },
  { kind: "sp", label: "Silver", unit: "sp" },
  { kind: "cp", label: "Copper", unit: "cp" },
];

const fmtGp = (n: number) => n.toFixed(2).replace(/\.?0+$/, "");

/**
 * The coin tracker bottom sheet. A hero total tops a list of denomination rows,
 * each with inline −/+ steppers and a tap-to-edit count (the shared keypad for
 * Add/Spend/Set). The footer hosts auto-distill — collapse the purse into the
 * fewest coins — gated behind a visual before→after confirmation, with a
 * one-tap undo after it runs. Presentational; reuses the `.hp-editor` shell.
 */
export function CoinSheet({
  pp,
  gp,
  sp,
  cp,
  total,
  onAdd,
  onSpend,
  onSet,
  onDistill,
  lastDistill,
  onUndoDistill,
  onDismissDistill,
  onClose,
}: CoinSheetProps) {
  const counts: Record<CoinKind, number> = { pp, gp, sp, cp };
  const coins: Coins = { pp, gp, sp, cp };
  const [editing, setEditing] = useState<CoinKind | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Auto-dismiss the undo affordance after a beat, mirroring the HP undo pill.
  const onDismissRef = useRef(onDismissDistill);
  onDismissRef.current = onDismissDistill;
  useEffect(() => {
    if (!lastDistill) return;
    const t = setTimeout(() => onDismissRef.current(), 5000);
    return () => clearTimeout(t);
  }, [lastDistill]);

  // Distilling only does something when the purse isn't already minimal.
  const canDistill = !coinsEqual(coins, distill(coins));

  // The confirmation is reached from the console's distill action; cancelling or
  // committing returns to the console (the keypad stays open underneath).
  if (confirming) {
    return <DistillConfirm coins={coins} onConfirm={onDistill} onClose={() => setConfirming(false)} />;
  }

  if (editing) {
    const row = ROWS.find((r) => r.kind === editing)!;
    // One keypad, retargetable: the strip switches which denomination the digits
    // and Add/Spend/Set act on, without closing the keypad. Counts stay live.
    const switcher = (
      <div className="coin-switcher" role="group" aria-label="Denomination">
        {ROWS.map((r) => (
          <button
            key={r.kind}
            type="button"
            className="coin-switcher__tab"
            data-kind={r.kind}
            aria-pressed={r.kind === editing}
            aria-label={`${r.label} — ${counts[r.kind]} ${r.unit}`}
            onClick={() => setEditing(r.kind)}
          >
            <span className="coin-switcher__head">
              <span className="coin-row__dot" aria-hidden="true" />
              <span className="coin-switcher__unit">{r.unit}</span>
            </span>
            <span className="coin-switcher__count">{counts[r.kind]}</span>
          </button>
        ))}
      </div>
    );
    // Distill + its undo live ON the console — part of the coin calculator, not a
    // detached/floating pill. After distilling, the same slot offers the undo.
    const distillFooter = lastDistill ? (
      <div className="coins__undo" role="status">
        <span className="coins__undo-label">Distilled</span>
        <button type="button" className="coins__undo-btn" onClick={onUndoDistill}>
          ↶ Undo
        </button>
      </div>
    ) : (
      <button type="button" className="coins__distill" disabled={!canDistill} onClick={() => setConfirming(true)}>
        <span className="coins__distill-glyph" aria-hidden="true">
          ⚗
        </span>
        {canDistill ? "Distill to fewest coins" : "Already distilled"}
      </button>
    );
    return (
      <AmountKeypad
        ariaLabel="Coins"
        header={switcher}
        context={`${row.label} — ${counts[editing]} ${row.unit}`}
        footer={distillFooter}
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
      <div
        className="hp-editor__sheet coins"
        role="dialog"
        aria-modal="true"
        aria-label="Coins"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="coins__head">
          <span className="coins__label">HOARD</span>
          <button type="button" className="coins__close" aria-label="Close" onClick={onClose}>
            <Glyph name="close" />
          </button>
        </div>
        <div className="coins__hero">
          <span className="coins__total" data-testid="coins-total">
            {fmtGp(total)} gp
          </span>
          <span className="coins__hero-cap">total wealth · tap a coin to edit</span>
        </div>
        <div className="coins__rows">
          {ROWS.map((r) => (
            <CoinRow
              key={r.kind}
              kind={r.kind}
              label={r.label}
              unit={r.unit}
              count={counts[r.kind]}
              canSpend={canSpend(coins, r.kind, 1)}
              onAdd={() => onAdd(r.kind, 1)}
              onSpend={() => onSpend(r.kind, 1)}
              onEdit={() => setEditing(r.kind)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
