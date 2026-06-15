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

  // Escape closes; hardware digits / Backspace also drive it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onCloseRef.current();
      if (e.key >= "0" && e.key <= "9") return push(e.key);
      if (e.key === "Backspace") return back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
          <button type="button" className="keypad__apply" data-kind="damage" aria-label="Damage" disabled={!hasAmount} onClick={() => commit(onDamage)}>– Damage</button>
          <button type="button" className="keypad__apply" data-kind="heal" aria-label="Heal" disabled={!hasAmount} onClick={() => commit(onHeal)}>+ Heal</button>
        </div>
        <div className="keypad__secondary">
          <button type="button" className="keypad__minor" disabled={!hasAmount} onClick={() => commit(onSetCurrent)}>Set to {amount}</button>
          <button type="button" className="keypad__minor" data-kind="temp" disabled={!hasAmount} onClick={() => commit(onSetTemp)}>Temp = {amount}</button>
        </div>
      </div>
    </div>
  );
}
