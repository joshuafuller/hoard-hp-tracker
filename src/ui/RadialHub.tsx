import { type ReactNode, useEffect, useRef, useState } from "react";
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
  icon: ReactNode;
  onSelect: () => void;
  /** Set for toggles → exposes aria-pressed; omitted for plain actions. */
  pressed?: boolean;
}

const Svg = ({ children }: { children: ReactNode }) => (
  <svg className="radial-hub__icon" viewBox="0 0 24 24" width="18" height="18" fill="none"
    stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const ICONS: Record<string, ReactNode> = {
  coins: <Svg><circle cx="9" cy="9" r="5.2" /><path d="M14.4 6.2A5.2 5.2 0 1 1 11 17.4" /></Svg>,
  dice: <Svg><path d="M12 2.5 20 7v10l-8 4.5L4 17V7z" /><path d="M12 2.5V21M4 7l8 4 8-4" /></Svg>,
  concentration: <Svg><path d="M12 2.5 17 12l-5 9.5L7 12z" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /></Svg>,
  // Speaker with sound waves (on) vs a struck-through speaker (muted) — the universal
  // mute glyph reads state at a glance, not just by colour.
  soundOn: <Svg><path d="M4 9.5v5h3.5L13 19V5L7.5 9.5z" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a9 9 0 0 1 0 12" /></Svg>,
  soundOff: <Svg><path d="M4 9.5v5h3.5L13 19V5L7.5 9.5z" /><path d="M17 9.5l4 5M21 9.5l-4 5" /></Svg>,
  about: <Svg><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><circle cx="12" cy="7.6" r="0.2" fill="currentColor" stroke="currentColor" /></Svg>,
};

/**
 * The single gold sigil that replaces the accumulating chrome row (#74). A
 * disclosure control: the hub carries `aria-expanded`/`aria-haspopup`, and
 * activating it fans out the secondary controls — Coins + Dice (actions),
 * Concentration + Sound (toggles reflecting state via aria-pressed), and About.
 * Rests stay in the footer.
 *
 * Layered for depth (not flat): a dimming scrim floats the fan above the app, a soft
 * radial glow blooms behind it, the sigil pulses at rest + rotates open, and the
 * icon chips spring out staggered with layered shadows. The fan stays mounted
 * (collapsed + inert when closed) so toggling actually animates; everything
 * simplifies under prefers-reduced-motion.
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

  // Return focus to the sigil when the fan closes via keyboard/activation so focus
  // is never stranded on an inert fan button (Copilot #152).
  const focusSigil = () => {
    rootRef.current?.querySelector<HTMLButtonElement>(".radial-hub__sigil")?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        focusSigil();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        // A dismiss tap on the dimmed area shouldn't also act on the app underneath
        // (e.g. open the keypad). Capture-phase + stopPropagation closes cleanly; the
        // scrim itself is pointer-events:none so it never intercepts the chips (#152).
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [open]);

  const items: HubItem[] = [
    { key: "coins", label: "Coins", icon: ICONS.coins, onSelect: onCoins },
    { key: "dice", label: "Dice", icon: ICONS.dice, onSelect: onDice },
    { key: "concentration", label: "Concentration", icon: ICONS.concentration, onSelect: onToggleConcentration, pressed: concentrating },
    { key: "sound", label: soundEnabled ? "Sound" : "Muted", icon: soundEnabled ? ICONS.soundOn : ICONS.soundOff, onSelect: onToggleSound, pressed: soundEnabled },
    { key: "about", label: "About", icon: ICONS.about, onSelect: onAbout },
  ];

  const select = (fn: () => void) => () => {
    setOpen(false);
    // Toggles (concentration/sound) keep the user on the hub → restore focus to the
    // sigil; sheet-openers (coins/dice/about) then move focus into their own dialog.
    focusSigil();
    fn();
  };

  return (
    <div className="radial-hub" ref={rootRef} data-open={open || undefined}>
      {/* Depth layer: dims + blurs the app so the fan reads as floating above it.
          Purely visual (pointer-events:none) — dismiss is handled by the window
          listener so it never intercepts the fan's chips. */}
      <div className="radial-hub__scrim" aria-hidden="true" />
      {/* Soft gold bloom behind the fan. */}
      <div className="radial-hub__glow" aria-hidden="true" />
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
      {/* Stays mounted (collapsed + inert when closed) so toggling data-open ANIMATES
          the chips rather than popping them in. aria-hidden + inert keep them out of
          the a11y tree, tab order, and pointer events while closed. */}
      <div className="radial-hub__fan" aria-hidden={!open || undefined} inert={!open || undefined}>
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            className="radial-hub__action"
            data-action={item.key}
            tabIndex={open ? undefined : -1}
            aria-pressed={item.pressed === undefined ? undefined : item.pressed}
            onClick={select(item.onSelect)}
          >
            <span className="radial-hub__action-icon">{item.icon}</span>
            <span className="radial-hub__action-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
