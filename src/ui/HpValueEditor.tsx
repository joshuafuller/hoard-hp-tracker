import { useEffect, useId, useRef, useState } from "react";
import { Button, Stepper } from "./controls";
import { haptic } from "../sound/haptics";

export interface HpValueEditorProps {
  /** Human label, e.g. "Max HP" — titles the modal and names the controls. */
  label: string;
  /** The committed value (owned by the store; flows back in via props). */
  value: number;
  /** Step down by one (left half of the pill). */
  onDecrement: () => void;
  /** Step up by one (right half of the pill). */
  onIncrement: () => void;
  /** Commit a directly-typed value. */
  onSet: (n: number) => void;
  /** Dismiss the editor. */
  onClose: () => void;
}

/**
 * A focused modal for setting one HP value. The control is a single pill:
 * a left "−" half, a big tap-to-type number in the middle, and a right "+" half.
 * Presentational — stepping and committing flow out via callbacks; the value
 * flows back in via props (the store clamps).
 */
export function HpValueEditor({
  label,
  value,
  onDecrement,
  onIncrement,
  onSet,
  onClose,
}: HpValueEditorProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  // Keep the latest onClose without re-running the mount effects each parent render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [draft, setDraft] = useState(String(value));

  // Re-sync the draft when the committed value changes from outside (± taps).
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  // Mount once: focus the number so typing just works.
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Mount once: Escape closes; Tab is trapped within the dialog (a11y).
  useEffect(() => {
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

  function commit() {
    const trimmed = draft.trim();
    const parsed = Number(trimmed);
    if (trimmed !== "" && Number.isFinite(parsed)) {
      onSet(Math.trunc(parsed));
    } else {
      setDraft(String(value));
    }
  }

  return (
    <div
      className="hp-editor"
      data-testid="hp-editor-backdrop"
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        className="hp-editor__sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Set ${label}`}
        // Clicks inside the sheet must not bubble to the backdrop's close.
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="hp-editor__title">Set {label}</h2>

        <Stepper
          className="hp-editor__pill"
          label={label}
          onDec={() => {
            haptic("tap");
            onDecrement();
          }}
          onInc={() => {
            haptic("tap");
            onIncrement();
          }}
        >
          <input
            id={id}
            ref={inputRef}
            type="number"
            inputMode="numeric"
            className="hp-editor__value"
            aria-label={label}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commit();
                e.currentTarget.blur();
              }
            }}
          />
        </Stepper>

        <Button variant="primary" className="hp-editor__done" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}
