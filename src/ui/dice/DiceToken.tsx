import { IconButton } from "../controls";

export interface DiceTokenProps {
  onOpen: () => void;
}

/**
 * The chrome entry point: a gold d20 medallion sitting alongside the coin / sound /
 * concentration controls. Tapping it opens the dice tray. Uses the shared
 * `IconButton` token (gold medallion); the `dice-token__face` span styles the "d20".
 */
export function DiceToken({ onOpen }: DiceTokenProps) {
  return (
    <IconButton variant="token" className="dice-token" aria-label="Roll dice" onClick={onOpen}>
      <span className="dice-token__face" aria-hidden="true">
        d20
      </span>
    </IconButton>
  );
}
