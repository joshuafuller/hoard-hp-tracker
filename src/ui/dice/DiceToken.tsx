export interface DiceTokenProps {
  onOpen: () => void;
}

/**
 * The chrome entry point: a gold d20 medallion sitting alongside the coin / sound /
 * concentration controls. Tapping it opens the dice tray. Styled to match the
 * `.coin-token` family (see styles.css `.dice-token`).
 */
export function DiceToken({ onOpen }: DiceTokenProps) {
  return (
    <button type="button" className="dice-token" aria-label="Roll dice" onClick={onOpen}>
      <span className="dice-token__face" aria-hidden="true">
        d20
      </span>
    </button>
  );
}
