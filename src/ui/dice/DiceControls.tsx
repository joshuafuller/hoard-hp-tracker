import { advantageApplies, poolToNotation, type DiePool, type RollMode } from "../../domain/dice";
import { Glyph } from "../icons/Glyph";

/** The die sizes offered as chips, in glance order. */
export const DICE_SIDES = [4, 6, 8, 10, 12, 20, 100] as const;

export interface DiceControlsProps {
  /** The built dice pool (tap order). */
  pool: DiePool;
  /** Current signed modifier. */
  modifier: number;
  /** Roll mode — advantage/disadvantage only valid for a lone d20. */
  mode: RollMode;
  /** The notation to roll — the editable expression field (chips write here too). */
  notation: string;
  /** True while a throw is settling (disables Throw). */
  rolling?: boolean;
  onAddDie: (sides: number) => void;
  onRemoveDie: (sides: number) => void;
  onClear: () => void;
  onStepModifier: (delta: number) => void;
  onSetMode: (mode: RollMode) => void;
  onRoll: () => void;
  /** Hand-typed notation in the same field (no separate panel). */
  onNotationChange: (notation: string) => void;
}

const MODES: Array<{ key: RollMode; label: string; sub: string; cls: string }> = [
  { key: "disadvantage", label: "Disadvantage", sub: "keep low", cls: "dis" },
  { key: "normal", label: "Normal", sub: "1 die", cls: "nrm" },
  { key: "advantage", label: "Advantage", sub: "keep high", cls: "adv" },
];

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/**
 * The dock's dice-pool builder: tap a chip to add one die (badge shows the count),
 * tap a pool tag to remove one, Clear to reset. The live notation mirrors the
 * notation field — buttons and notation are two views of one roll, so every
 * permutation is reachable both ways. Advantage/Disadvantage is the 5e keep-high/
 * low and is enabled only for a lone d20. Presentational — state lives in the tray.
 */
export function DiceControls({
  pool,
  modifier,
  mode,
  notation,
  rolling = false,
  onAddDie,
  onRemoveDie,
  onClear,
  onStepModifier,
  onSetMode,
  onRoll,
  onNotationChange,
}: DiceControlsProps) {
  const advAvailable = advantageApplies(pool);
  const isEmpty = notation.trim() === "";
  // The notation field doubles as the typed-notation input. When it diverges from
  // the built pool, the user has hand-edited it ("manual"), so the structured
  // tags/advantage no longer describe the roll — hide/disable them.
  const manual = !isEmpty && notation !== poolToNotation(pool, modifier, mode);
  const showTags = pool.length > 0 && !manual;

  return (
    <div className="dice-controls">
      {/* the live expression IS the notation field — tap it and type, no panel */}
      <div className="dice-pool">
        <input
          className="dice-pool__expr"
          aria-label="Dice notation"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="tap dice or type, e.g. 2d6+3"
          value={notation}
          onChange={(e) => onNotationChange(e.target.value)}
        />
        {!isEmpty && (
          <button type="button" className="dice-pool__clear" aria-label="Clear dice" onClick={onClear}>
            <Glyph name="clear" />
          </button>
        )}
      </div>

      {/* removable tags (so a misclick isn't fatal) — only in build mode */}
      {showTags && (
        <div className="dice-pool__tags" role="group" aria-label="Dice in pool">
          {pool.map((g) => (
            <button
              key={g.sides}
              type="button"
              className="dice-pool__tag"
              aria-label={`Remove one d${g.sides}`}
              onClick={() => onRemoveDie(g.sides)}
            >
              {g.count}d{g.sides} <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}

      {/* add palette — flexible pills that always fit the row (never clip) */}
      <div className="dice-chips" role="group" aria-label="Add die">
        {DICE_SIDES.map((s) => {
          // In manual mode the pool no longer describes the roll, so don't show
          // its (stale) badge/highlight on the chips.
          const g = manual ? undefined : pool.find((x) => x.sides === s);
          return (
            <button
              key={s}
              type="button"
              className="dice-chip"
              aria-label={`Add d${s}`}
              data-on={!!g}
              onClick={() => onAddDie(s)}
            >
              d{s}
              {g && <span className="dice-chip__badge">{g.count}</span>}
            </button>
          );
        })}
      </div>

      {/* co-equal advantage segment — enabled only for a lone d20 */}
      <div className="dice-controls__adv" role="group" aria-label="Advantage">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            className={`dice-adv dice-adv--${m.cls}`}
            aria-pressed={m.key === mode}
            data-on={m.key === mode}
            disabled={(manual || !advAvailable) && m.key !== "normal"}
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
        <button type="button" className="dice-throw" onClick={onRoll} disabled={rolling || isEmpty}>
          {rolling ? "Throwing…" : "Throw"}
        </button>
      </div>
    </div>
  );
}
