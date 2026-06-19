export interface CoinButtonProps {
  onOpen: () => void;
}

/** The ¢ trigger in the top chrome that opens the coin sheet. */
export function CoinButton({ onOpen }: CoinButtonProps) {
  return (
    <button type="button" className="coin-button" aria-label="Coins" onClick={onOpen}>
      ¢
    </button>
  );
}
