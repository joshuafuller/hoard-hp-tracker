/**
 * Centered SVG icons for the dice-tray controls.
 *
 * Why this exists: Unicode symbol glyphs (✕ ⟲ ✚ …) used as button icons are
 * NOT reliably centered — flex/grid centers a glyph's layout box (advance width ×
 * line-height), but the visual ink sits off-centre by an amount that varies per
 * glyph and per font. An SVG drawn around the centre of a square viewBox is
 * geometrically centred every time, font-independent. So: never use text glyphs
 * for icon buttons — use this.
 */
export type DiceGlyphName = "close" | "log" | "clear" | "heal";

const PATHS: Record<DiceGlyphName, React.ReactNode> = {
  // an X — two crossed lines centred on (12,12)
  close: (
    <>
      <line x1="7" y1="7" x2="17" y2="17" />
      <line x1="17" y1="7" x2="7" y2="17" />
    </>
  ),
  // a clock — recent rolls / timestamps
  log: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 7.5V12l3.2 2" />
    </>
  ),
  // a trash can — clear the pool
  clear: (
    <>
      <path d="M5 7h14" />
      <path d="M9.5 7V5h5v2" />
      <path d="M7 7l1 12h8l1-12" />
    </>
  ),
  // a plus — apply as heal
  heal: (
    <>
      <line x1="12" y1="7" x2="12" y2="17" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </>
  ),
};

export function DiceGlyph({ name }: { name: DiceGlyphName }) {
  return (
    <svg
      className="dice-glyph"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
