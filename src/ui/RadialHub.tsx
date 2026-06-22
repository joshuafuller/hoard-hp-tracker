import { useEffect, useRef, useState } from "react";
import { IconButton } from "./controls";
import "./RadialHub.css";

export interface RadialHubProps {
  /** Open the coin tracker. */
  onCoins: () => void;
  /** Open the dice tray. */
  onDice: () => void;
  /** Open the About panel (source-repo link). */
  onAbout: () => void;
  /** Current concentration state (the chip reflects it via aria-pressed). */
  concentrating: boolean;
  /** Toggle concentration. */
  onToggleConcentration: () => void;
  /** Current sound-on state. */
  soundEnabled: boolean;
  /** Toggle sound (mute). */
  onToggleSound: () => void;
}

interface HubItem {
  key: string;
  label: string;
  onSelect: () => void;
  /** Set for toggles → exposes aria-pressed; omitted for plain actions. */
  pressed?: boolean;
}

/**
 * The single gold sigil that replaces the accumulating chrome row (#74). A
 * disclosure control: the hub carries `aria-expanded`/`aria-haspopup`, and
 * activating it fans out the secondary controls — Coins + Dice (actions),
 * Concentration + Sound (toggles, reflecting state via aria-pressed), and About
 * (the source-repo link panel). Rests stay in the footer. Selecting an item runs it
 * and closes; Escape or a tap outside cancels. The radial arc + motion live in CSS
 * and simplify under prefers-reduced-motion; the markup stays a plain, keyboard-
 * reachable button group.
 */
export function RadialHub({
  onCoins,
  onDice,
  onAbout,
  concentrating,
  onToggleConcentration,
  soundEnabled,
  onToggleSound,
}: RadialHubProps) {
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

  const items: HubItem[] = [
    { key: "coins", label: "Coins", onSelect: onCoins },
    { key: "dice", label: "Dice", onSelect: onDice },
    { key: "concentration", label: "Concentration", onSelect: onToggleConcentration, pressed: concentrating },
    { key: "sound", label: "Sound", onSelect: onToggleSound, pressed: soundEnabled },
    { key: "about", label: "About", onSelect: onAbout },
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
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              className="radial-hub__action"
              data-action={item.key}
              aria-pressed={item.pressed === undefined ? undefined : item.pressed}
              onClick={select(item.onSelect)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
