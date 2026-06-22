import { useEffect, useRef, useState } from "react";
import { IconButton } from "./controls";

export interface RadialHubProps {
  /** Open the coin tracker. */
  onCoins: () => void;
  /** Open the dice tray. */
  onDice: () => void;
  /** Open the rest flow (short/long). */
  onRests: () => void;
  /** Toggle / manage concentration. */
  onConcentration: () => void;
}

interface HubAction {
  key: string;
  label: string;
  fn: () => void;
}

/**
 * The single gold sigil that replaces the accumulating chrome row (#74). A
 * disclosure control: the hub carries `aria-expanded`/`aria-haspopup`, and
 * activating it reveals a fan of the secondary actions (Coins, Dice, Rests,
 * Concentration). Selecting one fires it and closes; Escape or a tap outside
 * cancels. The radial arc geometry + motion are layered on in CSS (slice 3) — the
 * markup is a plain, keyboard-reachable button group so it degrades gracefully and
 * stays accessible under prefers-reduced-motion.
 */
export function RadialHub({ onCoins, onDice, onRests, onConcentration }: RadialHubProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const actions: HubAction[] = [
    { key: "coins", label: "Coins", fn: onCoins },
    { key: "dice", label: "Dice", fn: onDice },
    { key: "rests", label: "Rest", fn: onRests },
    { key: "concentration", label: "Concentration", fn: onConcentration },
  ];

  const select = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div className="radial-hub" ref={rootRef} data-open={open || undefined}>
      <IconButton
        variant="token"
        className="radial-hub__sigil"
        aria-label="Actions"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg className="radial-hub__glyph" viewBox="0 0 24 24" width="22" height="22" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
          <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2.1 2.1M15.9 15.9 18 18M18 6l-2.1 2.1M8.1 15.9 6 18" />
        </svg>
      </IconButton>
      {open && (
        <div className="radial-hub__fan">
          {actions.map((a) => (
            <button
              key={a.key}
              type="button"
              className="radial-hub__action"
              data-action={a.key}
              onClick={select(a.fn)}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
