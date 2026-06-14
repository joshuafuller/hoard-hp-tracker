import { useEffect, useId, useState } from "react";

export interface NumberEditorProps {
  /** Field label, also the accessible name (e.g. "Current HP"). */
  label: string;
  /** The committed value reflected from state. */
  value: number;
  /** Called with the parsed value when the user commits a valid edit. */
  onCommit: (n: number) => void;
}

/**
 * Tap-to-type editor for an exact HP value (current, max, or temp). The field
 * tracks its own draft text while focused and commits — on blur or Enter — only
 * when the draft parses to a finite number, so a cleared or garbled entry never
 * clobbers state. The committed `value` flows back in via props.
 */
export function NumberEditor({ label, value, onCommit }: NumberEditorProps) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));

  // Re-sync the draft whenever the committed value changes from outside.
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commit() {
    const trimmed = draft.trim();
    const parsed = Number(trimmed);
    // Number() (not parseInt) interprets the whole value — "1e2" → 100, not 1 —
    // and Math.trunc keeps HP an integer. Blank/garbled input reverts to `value`.
    if (trimmed !== "" && Number.isFinite(parsed)) {
      onCommit(Math.trunc(parsed));
    } else {
      setDraft(String(value));
    }
  }

  return (
    <label className="number-editor" htmlFor={id}>
      <span className="number-editor__label">{label}</span>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        className="number-editor__input"
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
    </label>
  );
}
