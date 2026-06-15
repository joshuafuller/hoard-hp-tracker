import { useEffect, useRef, useState } from "react";

export interface CharacterNameProps {
  /** The current persisted name, blank when unset. */
  name: string;
  /** Called with the new name (trimmed); store handles the 24-char cap. */
  onSetName: (s: string) => void;
}

/**
 * A small, unobtrusive name label near the orb. Blank shows a faint "Add name"
 * affordance so it's discoverable without being forced. Tapping switches to an
 * inline text input; Enter or blur commits, Escape discards.
 */
export function CharacterName({ name, onSetName }: CharacterNameProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync draft from outside while not actively editing (store wrote a new value).
  useEffect(() => {
    if (!editing) setDraft(name);
  }, [name, editing]);

  // Focus + select on enter-edit.
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    onSetName(draft);
    setEditing(false);
  }

  function cancel() {
    setDraft(name);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="character-name character-name--editing">
        <input
          ref={inputRef}
          type="text"
          className="character-name__input"
          aria-label="Character name"
          value={draft}
          maxLength={24}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="character-name">
      {name ? (
        <button
          type="button"
          className="character-name__display character-name__display--set"
          aria-label="Edit name"
          onClick={() => { setDraft(name); setEditing(true); }}
        >
          {name}
        </button>
      ) : (
        <button
          type="button"
          className="character-name__display character-name__display--empty"
          aria-label="Add name"
          onClick={() => { setDraft(""); setEditing(true); }}
        />
      )}
    </div>
  );
}
