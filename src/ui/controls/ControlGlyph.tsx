/**
 * Centred SVG icons for the shared control primitives.
 *
 * Same rationale as src/ui/icons/Glyph.tsx: never use Unicode text glyphs for
 * icon buttons — their visual ink does not sit at the centre of the layout box,
 * so they look off-centre. An SVG drawn around the centre of a square viewBox is
 * geometrically centred every time, font-independent.
 *
 * Kept local to the controls package so the primitives are self-contained and
 * phase-2 migration can swap in app-specific Glyphs without touching them.
 */
export type ControlGlyphName = "close" | "minus" | "plus";

const PATHS: Record<ControlGlyphName, React.ReactNode> = {
  // an X — two crossed lines centred on (12,12)
  close: (
    <>
      <line x1="7" y1="7" x2="17" y2="17" />
      <line x1="17" y1="7" x2="7" y2="17" />
    </>
  ),
  // a minus — decrement
  minus: <line x1="6" y1="12" x2="18" y2="12" />,
  // a plus — increment
  plus: (
    <>
      <line x1="12" y1="6" x2="12" y2="18" />
      <line x1="6" y1="12" x2="18" y2="12" />
    </>
  ),
};

export function ControlGlyph({
  name,
  size = 18,
}: {
  name: ControlGlyphName;
  size?: number;
}) {
  return (
    <svg
      className="ctl-glyph"
      data-icon={name}
      viewBox="0 0 24 24"
      width={size}
      height={size}
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
