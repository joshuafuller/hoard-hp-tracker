import type { RollMode } from "../../domain/dice";

/** The die sizes offered as chips, in glance order. */
export const DICE_SIDES = [4, 6, 8, 10, 12, 20, 100] as const;

export interface DiceControlsProps {
  /** Currently selected die size. */
  sides: number;
  /** Current signed modifier. */
  modifier: number;
  /** Current roll mode — advantage/disadvantage are co-equal. */
  mode: RollMode;
  /** True while a throw is settling (disables Throw). */
  rolling?: boolean;
  onSelectDie: (sides: number) => void;
  onSetMode: (mode: RollMode) => void;
  onStepModifier: (delta: number) => void;
  onRoll: () => void;
  onOpenNotation: () => void;
}

const MODES: Array<{ key: RollMode; label: string; sub: string; cls: string }> = [
  { key: "disadvantage", label: "Disadvantage", sub: "keep low", cls: "dis" },
  { key: "normal", label: "Normal", sub: "1 die", cls: "nrm" },
  { key: "advantage", label: "Advantage", sub: "keep high", cls: "adv" },
];

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/**
 * The dock's controls: die chips + a symmetric Disadvantage·Normal·Advantage
 * segment (co-equal, one tap) + a modifier stepper + Throw, with a secondary
 * notation escape hatch. Dumb/presentational — all state is lifted to the tray.
 */
export function DiceControls({
  sides,
  modifier,
  mode,
  rolling = false,
  onSelectDie,
  onSetMode,
  onStepModifier,
  onRoll,
  onOpenNotation,
}: DiceControlsProps) {
  return (
    <div className="dice-controls">
      <div className="dice-controls__chips" role="group" aria-label="Die">
        {DICE_SIDES.map((s) => (
          <button
            key={s}
            type="button"
            className="dice-chip"
            aria-pressed={s === sides}
            data-on={s === sides}
            onClick={() => onSelectDie(s)}
          >
            d{s}
          </button>
        ))}
      </div>

      <div className="dice-controls__adv" role="group" aria-label="Advantage">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            className={`dice-adv dice-adv--${m.cls}`}
            aria-pressed={m.key === mode}
            data-on={m.key === mode}
            onClick={() => onSetMode(m.key)}
          >
            <span>{m.label}</span>
            <small>{m.sub}</small>
          </button>
        ))}
      </div>

      <div className="dice-controls__row">
        <div className="dice-mod" role="group" aria-label="Modifier">
          <button type="button" className="dice-mod__pm" aria-label="Decrease modifier" onClick={() => onStepModifier(-1)}>
            −
          </button>
          <span className="dice-mod__val">{signed(modifier)}</span>
          <button type="button" className="dice-mod__pm" aria-label="Increase modifier" onClick={() => onStepModifier(1)}>
            +
          </button>
        </div>
        <button type="button" className="dice-throw" onClick={onRoll} disabled={rolling}>
          {rolling ? "Throwing…" : "Throw"}
        </button>
        <button type="button" className="dice-kbtn" aria-label="Enter notation" onClick={onOpenNotation}>
          {/* keyboard glyph — notation escape hatch */}
          ⌨
        </button>
      </div>
    </div>
  );
}
