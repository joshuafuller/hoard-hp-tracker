import { AmountKeypad } from "./AmountKeypad";

export interface HpKeypadProps {
  /** Current HP — shown as context above the pad (e.g. "current 24 / 30"). */
  current: number;
  /** Max HP — shown as context alongside current. */
  max: number;
  /** Temporary HP — shown as context when present. */
  temp: number;
  /** Apply the typed amount as damage. */
  onDamage: (n: number) => void;
  /** Apply the typed amount as healing. */
  onHeal: (n: number) => void;
  /** Set current HP directly to the typed amount (0 allowed → death saves). */
  onSetCurrent: (n: number) => void;
  /** Set temporary HP to the typed amount (0 allowed → clear the ward). */
  onSetTemp: (n: number) => void;
  /** Dismiss the keypad. */
  onClose: () => void;
}

/**
 * Number-first quick-entry keypad. Type an amount, then commit it as Damage,
 * Heal, Set (current), or Temp. Presentational — every action flows out via a
 * callback; the store owns the rules (heal caps, temp drains first, death saves).
 */
export function HpKeypad({ current, max, temp, onDamage, onHeal, onSetCurrent, onSetTemp, onClose }: HpKeypadProps) {
  return (
    <AmountKeypad
      ariaLabel="Apply amount to HP"
      context={<>current {current} / {max}{temp > 0 ? ` · +${temp} temp` : ""}</>}
      primary={[
        { label: () => "– Damage", ariaLabel: "Damage", tone: "damage", gate: "positive", onCommit: onDamage },
        { label: () => "+ Heal", ariaLabel: "Heal", tone: "heal", gate: "positive", onCommit: onHeal },
      ]}
      secondary={[
        { label: (n) => `Set to ${n}`, gate: "typed", onCommit: onSetCurrent },
        { label: (n) => `Temp = ${n}`, tone: "temp", gate: "typed", onCommit: onSetTemp },
      ]}
      onClose={onClose}
    />
  );
}
