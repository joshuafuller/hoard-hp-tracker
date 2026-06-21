import { advantageApplies, poolToNotation, type DiePool, type RollMode } from "../../domain/dice";

/** The die sizes offered as chips, in glance order. */
export const DICE_SIDES = [4, 6, 8, 10, 12, 20, 100] as const;

export interface DiceControlsProps {
  /** The built dice pool (tap order). */
  pool: DiePool;
  /** Current signed modifier. */
  modifier: number;
  /** Roll mode — advantage/disadvantage only valid for a lone d20. */
  mode: RollMode;
  /** True while a throw is settling (disables Throw). */
  rolling?: boolean;
  onAddDie: (sides: number) => void;
  onRemoveDie: (sides: number) => void;
  onClear: () => void;
  onStepModifier: (delta: number) => void;
  onSetMode: (mode: RollMode) => void;
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
  rolling = false,
  onAddDie,
  onRemoveDie,
  onClear,
  onStepModifier,
  onSetMode,
  onRoll,
  onOpenNotation,
}: DiceControlsProps) {
  const empty = pool.length === 0;
  const advAvailable = advantageApplies(pool);
  const notation = poolToNotation(pool, modifier, mode);

  return (
    <div className="dice-controls">
      {/* live expression — removable pool tags + modifier, or a hint when empty */}
      <div className="dice-pool">
        {empty ? (
          <span className="dice-pool__hint">tap dice to build a roll…</span>
        ) : (
          <>
            <span className="dice-pool__expr">{notation}</span>
            <button type="button" className="dice-pool__clear" aria-label="Clear dice" onClick={onClear}>
              ⟲
            </button>
          </>
        )}
        <button type="button" className="dice-pool__kbd" aria-label="Enter notation" onClick={onOpenNotation}>
          ⌨
        </button>
      </div>

      {/* removable tags (so a misclick isn't fatal) */}
      {!empty && (
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
          const g = pool.find((x) => x.sides === s);
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
            disabled={!advAvailable && m.key !== "normal"}
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
        <button type="button" className="dice-throw" onClick={onRoll} disabled={rolling || empty}>
          {rolling ? "Throwing…" : "Throw"}
        </button>
      </div>
    </div>
  );
}
