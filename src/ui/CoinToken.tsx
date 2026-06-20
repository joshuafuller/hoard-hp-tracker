import { type CoinSigil, SIGIL_PATHS } from "./icons/sigils";

/**
 * The Molten Hoard control primitive: a struck-gold medallion ("minted coin")
 * carrying an engraved sigil instead of a text label. The polished metal finish
 * is pure CSS (see `.coin-token` in styles.css); the sigil is an inline SVG path
 * (so it inherits `currentColor` and the engraved relief). The visible glyph is
 * decorative — meaning comes from the required `label` (the accessible name).
 */
export type { CoinSigil };

export interface CoinTokenProps {
  sigil: CoinSigil;
  /** Accessible name — what the control does (the glyph is decorative). */
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Optional tone accent for a per-action edge glow (e.g. damage ruby). */
  tone?: "gold" | "damage" | "heal";
}

export function CoinToken({ sigil, label, onClick, disabled, tone = "gold" }: CoinTokenProps) {
  return (
    <button
      type="button"
      className="coin-token"
      data-sigil={sigil}
      data-tone={tone}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="coin-token__face" aria-hidden="true">
        <svg viewBox="0 0 512 512" fill="currentColor" focusable="false">
          <path d={SIGIL_PATHS[sigil]} />
        </svg>
      </span>
    </button>
  );
}
