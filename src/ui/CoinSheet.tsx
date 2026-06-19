import { useState } from "react";
import type { CoinKind } from "../domain/coins";
import { AmountKeypad } from "./AmountKeypad";

export interface CoinSheetProps {
  pp: number; gp: number; sp: number; cp: number; total: number;
  onAdd: (kind: CoinKind, n: number) => void;
  onSpend: (kind: CoinKind, n: number) => void;
  onSet: (kind: CoinKind, n: number) => void;
  onClose: () => void;
}

const ROWS: { kind: CoinKind; label: string; unit: string }[] = [
  { kind: "pp", label: "Platinum", unit: "pp" },
  { kind: "gp", label: "Gold", unit: "gp" },
  { kind: "sp", label: "Silver", unit: "sp" },
  { kind: "cp", label: "Copper", unit: "cp" },
];

/** Bottom-sheet coin tracker. Rows show each count; tapping one opens the shared
 * keypad (Add/Spend/Set) for that denomination. Spending converts across
 * denominations automatically (see `spendCoin`). Presentational. */
export function CoinSheet({ pp, gp, sp, cp, total, onAdd, onSpend, onSet, onClose }: CoinSheetProps) {
  const counts: Record<CoinKind, number> = { pp, gp, sp, cp };
  const [editing, setEditing] = useState<CoinKind | null>(null);

  if (editing) {
    const row = ROWS.find((r) => r.kind === editing)!;
    return (
      <AmountKeypad
        ariaLabel={`${row.label} coins`}
        context={`${row.label} — ${counts[editing]} ${row.unit}`}
        closeOnCommit
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
