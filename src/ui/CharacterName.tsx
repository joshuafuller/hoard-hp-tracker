import { useEffect, useRef, useState } from "react";

export interface CharacterNameProps {
  /** The current persisted name, blank when unset. */
  name: string;
  /** Called with the new name, trimmed here before passing. Store handles the 24-char cap. */
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
    onSetName(draft.trim());
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
        >
          <svg className="character-name__pencil" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
          Name your character
        </button>
      )}
    </div>
  );
}
