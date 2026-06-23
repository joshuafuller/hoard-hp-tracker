import { advantageApplies, poolToNotation, type DiePool, type RollMode } from "../../domain/dice";
import { Glyph } from "../icons/Glyph";
import { Button, Chip, IconButton, Segment, Stepper, type SegmentOption } from "../controls";

/** The die sizes offered as chips, in glance order. */
const DICE_SIDES = [4, 6, 8, 10, 12, 20, 100] as const;

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
          <IconButton variant="ghost" className="dice-pool__clear" aria-label="Clear dice" onClick={onClear}>
            <Glyph name="clear" />
          </IconButton>
        )}
      </div>

      {/* removable tags (so a misclick isn't fatal) — only in build mode */}
      {showTags && (
        <div className="dice-pool__tags" role="group" aria-label="Dice in pool">
          {pool.map((g) => (
            <Chip
              key={g.sides}
              className="dice-pool__tag"
              aria-label={`Remove one d${g.sides}`}
              onClick={() => onRemoveDie(g.sides)}
            >
              {g.count}d{g.sides} ×
            </Chip>
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
            <Chip
              key={s}
              className="dice-chip"
              aria-label={`Add d${s}`}
              selected={!!g}
              badge={g?.count}
              onClick={() => onAddDie(s)}
            >
              d{s}
            </Chip>
          );
        })}
      </div>

      {/* co-equal advantage segment — enabled only for a lone d20 */}
      <Segment
        className="dice-controls__adv"
        aria-label="Advantage"
        value={mode}
        onChange={onSetMode}
        options={MODES.map(
          (m): SegmentOption<RollMode> => ({
            value: m.key,
            label: m.label,
            hint: m.sub,
            disabled: (manual || !advAvailable) && m.key !== "normal",
          }),
        )}
      />

      <div className="dice-controls__row">
        <Stepper
          className="dice-mod"
          label="modifier"
          value={modifier}
          formatValue={signed}
          onDec={() => onStepModifier(-1)}
          onInc={() => onStepModifier(1)}
        />
        <Button variant="primary" size="lg" className="dice-throw" onClick={onRoll} disabled={rolling || isEmpty}>
          {rolling ? "Throwing…" : "Throw"}
        </Button>
      </div>
    </div>
  );
}
