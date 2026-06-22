import { SIGIL_PATHS } from "./icons/sigils";
import { IconButton } from "./controls";

export interface CoinButtonProps {
  onOpen: () => void;
}

/** The coins trigger in the top chrome that opens the coin sheet. */
export function CoinButton({ onOpen }: CoinButtonProps) {
  return (
    <IconButton variant="token" className="coin-button" aria-label="Coins" onClick={onOpen}>
      <svg className="coin-button__icon" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true" focusable="false">
        <path d={SIGIL_PATHS.coins} />
      </svg>
    </IconButton>
  );
}
