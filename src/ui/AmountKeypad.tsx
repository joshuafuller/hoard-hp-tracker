import { type ReactNode, useEffect, useRef, useState } from "react";

export interface KeypadAction {
  label: (amount: number) => ReactNode;
  ariaLabel?: string;
  tone?: string; // → data-kind for colour
  gate: "positive" | "typed"; // positive: disabled at 0; typed: explicit 0 ok
  onCommit: (n: number) => void;
}

export interface AmountKeypadProps {
  ariaLabel: string;
  context: ReactNode;
  /** Optional content rendered above the amount — e.g. a denomination switcher. */
  header?: ReactNode;
  /** Optional content rendered below the actions — e.g. a distill/undo control. */
  footer?: ReactNode;
  primary: KeypadAction[];
  secondary?: KeypadAction[];
  closeOnCommit?: boolean;
  onClose: () => void;
}

function haptic() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(10);
}
const MAX_DIGITS = 4;

export function AmountKeypad({ ariaLabel, context, header, footer, primary, secondary = [], closeOnCommit = true, onClose }: AmountKeypadProps) {
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
    else setDigits("");
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
        {header}
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
        {footer}
      </div>
    </div>
  );
}
