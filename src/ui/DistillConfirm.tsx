import { useEffect, useRef } from "react";
import { type Coins, distill, totalGp } from "../domain/coins";

export interface DistillConfirmProps {
  /** The current purse — the preview computes the distilled result from this. */
  coins: Coins;
  /** Commit the distill. */
  onConfirm: () => void;
  /** Dismiss without distilling. */
  onClose: () => void;
}

const ROWS: { kind: keyof Coins; label: string }[] = [
  { kind: "pp", label: "Platinum" },
  { kind: "gp", label: "Gold" },
  { kind: "sp", label: "Silver" },
  { kind: "cp", label: "Copper" },
];

const fmtGp = (n: number) => n.toFixed(2).replace(/\.?0+$/, "");

/**
 * Confirmation for auto-distill: a before→after diff per denomination so the
 * reshuffle is never a leap of faith, plus a "total unchanged" line proving
 * wealth is conserved. Reuses the `.hp-editor` backdrop/sheet. Escape closes.
 */
export function DistillConfirm({ coins, onConfirm, onClose }: DistillConfirmProps) {
  const after = distill(coins);
  const total = totalGp(coins); // distill conserves wealth, so before === after
  const confirmRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Escape closes; Tab is trapped within the dialog so focus can't escape to
  // the page behind it.
  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const sheet = sheetRef.current;
      if (!sheet) return;
      const focusable = sheet.querySelectorAll<HTMLElement>(
        'button, input, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (!sheet.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="hp-editor" data-testid="distill-backdrop" onClick={onClose}>
      <div
        ref={sheetRef}
        className="hp-editor__sheet distill"
        role="dialog"
        aria-modal="true"
        aria-label="Distill coins"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="distill__head">
          <h2 className="distill__title">Distill your hoard?</h2>
          <p className="distill__sub">same wealth · fewer coins</p>
        </div>
        <ul className="distill__rows">
          {ROWS.map(({ kind, label }) => (
            <li
              key={kind}
              className="distill__row"
              data-kind={kind}
              data-changed={coins[kind] !== after[kind] ? "true" : undefined}
            >
              <span className="distill__name">
                <span className="distill__dot" aria-hidden="true" />
                {label}
              </span>
              <span className="distill__values">
                <span className="distill__before">{coins[kind]}</span>
                <span className="distill__arrow" aria-hidden="true">
                  →
                </span>
                <span className="distill__after">{after[kind]}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="distill__total">
          <span className="distill__total-label">Total</span>
          <span className="distill__total-value">
            {fmtGp(total)} gp <span className="distill__same">✓ unchanged</span>
          </span>
        </div>
        <div className="distill__actions">
          <button type="button" className="distill__cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="distill__confirm"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Distill
          </button>
        </div>
      </div>
    </div>
  );
}
