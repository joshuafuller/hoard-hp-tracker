import { useEffect, useRef, useState } from "react";

export interface HpKeypadProps {
  /** Current HP — shown as context above the pad (e.g. "current 24 / 30"). */
  current: number;
  /** Max HP — shown as context alongside current. */
  max: number;
  /** Temporary HP — shown as context when present. */
  temp: number;
  /** Apply the typed amount as damage. */
  onDamage: (n: number) => void;
  /** Apply the typed amount as healing. */
  onHeal: (n: number) => void;
  /** Set current HP directly to the typed amount (0 allowed → death saves). */
  onSetCurrent: (n: number) => void;
  /** Set temporary HP to the typed amount (0 allowed → clear the ward). */
  onSetTemp: (n: number) => void;
  /** Dismiss the keypad. */
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
  // hasAmount gates the maths-only actions (0 damage/heal is meaningless);
  // typed gates the direct-set actions (an explicit 0 is valid — death saves,
  // clearing a ward).
  const hasAmount = amount > 0;
  const typed = digits !== "";

  const push = (d: string) => {
    haptic();
    setDigits((cur) => (cur === "0" ? d : (cur + d).slice(0, MAX_DIGITS)));
  };
  const back = () => { haptic(); setDigits((cur) => cur.slice(0, -1)); };
  const clear = () => { haptic(); setDigits(""); };
  const commit = (fn: (n: number) => void, ok: boolean) => {
    if (!ok) return;
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

  // Mount once: focus the first control so the dialog has the keyboard.
  useEffect(() => {
    sheetRef.current
      ?.querySelector<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])')
      ?.focus();
  }, []);

  // Mount once: trap Tab within the dialog (honours aria-modal; matches HpValueEditor).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
          <button type="button" className="keypad__apply" data-kind="damage" aria-label="Damage" disabled={!hasAmount} onClick={() => commit(onDamage, hasAmount)}>– Damage</button>
          <button type="button" className="keypad__apply" data-kind="heal" aria-label="Heal" disabled={!hasAmount} onClick={() => commit(onHeal, hasAmount)}>+ Heal</button>
        </div>
        <div className="keypad__secondary">
          <button type="button" className="keypad__minor" disabled={!typed} onClick={() => commit(onSetCurrent, typed)}>Set to {amount}</button>
          <button type="button" className="keypad__minor" data-kind="temp" disabled={!typed} onClick={() => commit(onSetTemp, typed)}>Temp = {amount}</button>
        </div>
      </div>
    </div>
  );
}
