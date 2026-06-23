import { useEffect, useRef, useState } from "react";
import { Button } from "./controls";
import { haptic } from "../sound/haptics";

export interface RestControlsProps {
  /** Unspent Hit Dice — Short Rest is disabled when this hits 0. */
  hitDiceAvailable: number;
  /** Spend one Hit Die toward a Short Rest. */
  onShortRest: () => void;
  /** Apply a full Long Rest recovery (HP, temp, death saves, Hit Dice). */
  onLongRest: () => void;
}

/**
 * The rest cluster next to the HP controls: a Short Rest button (spend one Hit
 * Die; disabled with an empty pool) and a Long Rest button that swaps into an
 * inline confirm — Long Rest is a sweeping state change, so it asks twice.
 * Presentational; callbacks out.
 */
export function RestControls({
  hitDiceAvailable,
  onShortRest,
  onLongRest,
}: RestControlsProps) {
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const longRestRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  // Move focus onto Confirm when the step opens; restore it to the Long Rest
  // button when the step closes (Confirm/Cancel remove the focused node, which
  // would otherwise drop focus to <body>). Only on the open↔close transition so
  // we never steal focus on initial mount.
  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
    else if (wasConfirming.current) longRestRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  return (
    <div className="rest-controls">
      {/* Short Rest is the smaller commit → ghost; Long Rest is the bigger one →
          primary (the one dominant gold action). DESIGN.md / spec §5. */}
      <Button
        variant="ghost"
        size="lg"
        className="rest-controls__btn"
        data-kind="short"
        aria-label="Short Rest"
        disabled={hitDiceAvailable <= 0}
        onClick={() => {
          haptic("tap");
          onShortRest();
        }}
      >
        <span className="rest-controls__label">Short Rest</span>
        <span className="rest-controls__sub">Spend a Hit Die</span>
      </Button>

      {confirming ? (
        <div className="rest-controls__confirm" role="group" aria-label="Confirm Long Rest">
          <span className="rest-controls__confirm-prompt">Long Rest?</span>
          <Button
            ref={confirmRef}
            variant="primary"
            className="rest-controls__confirm-btn"
            data-kind="confirm"
            aria-label="Confirm Long Rest"
            onClick={() => {
              haptic("commit");
              setConfirming(false);
              onLongRest();
            }}
          >
            Confirm
          </Button>
          <Button
            variant="ghost"
            className="rest-controls__confirm-btn"
            data-kind="cancel"
            aria-label="Cancel Long Rest"
            onClick={() => {
              haptic("tap");
              setConfirming(false);
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          ref={longRestRef}
          variant="primary"
          size="lg"
          className="rest-controls__btn"
          data-kind="long"
          aria-label="Long Rest"
          onClick={() => {
            haptic("tap");
            setConfirming(true);
          }}
        >
          <span className="rest-controls__label">Long Rest</span>
          <span className="rest-controls__sub">Full recovery</span>
        </Button>
      )}
    </div>
  );
}
