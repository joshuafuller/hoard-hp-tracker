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
  return (
    <button
      type="button"
      className="concentration-toggle"
      data-concentrating={concentrating}
      aria-label="Concentration"
      aria-pressed={concentrating}
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
    </button>
  );
}
