import { useEffect, useRef } from "react";
import { playSfx } from "../sound/sfx";
import { IconButton } from "./controls";

export interface ConcentrationToggleProps {
  /** Whether the character is currently concentrating on a spell. */
  concentrating: boolean;
  /** Flip the concentration state. */
  onToggle: () => void;
}

/**
 * A small, Obsidian-styled toggle for spell Concentration (#30). It uses a
 * stable accessible name ("Concentration") with `aria-pressed` reflecting the
 * on/off state. When active, the button glows with a distinct concentration
 * tint (a muted purple to distinguish it from the HP accent).
 */
export function ConcentrationToggle({ concentrating, onToggle }: ConcentrationToggleProps) {
  // Confirm with a cue only when the state ACTUALLY changes — not optimistically on
  // tap. `useHp` no-ops setConcentrating(true) while downed (current ≤ 0), so a
  // rejected enable must not play the toggle-on cue (Codex #145). Fires on real
  // transitions either way (incl. an auto-drop on hitting 0).
  const prev = useRef(concentrating);
  useEffect(() => {
    if (concentrating !== prev.current) {
      playSfx(concentrating ? "toggleOn" : "toggleOff");
      prev.current = concentrating;
    }
  }, [concentrating]);

  return (
    <IconButton
      variant="ghost"
      className="concentration-toggle"
      data-concentrating={concentrating}
      aria-label="Concentration"
      pressed={concentrating}
      onClick={onToggle}
      title={concentrating ? "Concentrating — tap to drop" : "Not concentrating — tap to enable"}
    >
      {/* Stylised "C" diamond — a simple glyph that reads as "spell focus". */}
      <svg
        className="concentration-toggle__icon"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden="true"
        focusable="false"
      >
        {/* Diamond / rhombus representing a spell gem. */}
        <path
          d="M12 3 L21 12 L12 21 L3 12 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Inner dot — lit when concentrating. */}
        <circle
          cx="12"
          cy="12"
          r={concentrating ? 3 : 2}
          fill={concentrating ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    </IconButton>
  );
}
