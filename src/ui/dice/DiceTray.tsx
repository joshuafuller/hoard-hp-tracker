import { useCallback, useEffect, useRef, useState } from "react";
import {
  addToPool,
  advantageApplies,
  poolToNotation,
  removeFromPool,
  type DiePool,
  type RollMode,
  type RollRecord,
} from "../../domain/dice";
import { type HpDb, type RollContext } from "../../store/db";
import { useDiceHistory } from "../../store/useDiceHistory";
import { playSfx } from "../../sound/sfx";
import { createDiceTray, rollHeadless, type DiceTray as DiceTrayEngine } from "./diceEngine";
import { DiceControls } from "./DiceControls";
import { DiceResult } from "./DiceResult";
import { DiceHistory } from "./DiceHistory";
import { Glyph } from "../icons/Glyph";
import { Button, IconButton } from "../controls";

/**
 * A contextual roll the app owns the rule for, routed through the shared tray:
 * a death-save d20, or a Hit Die of `sides` faces (healing `roll + conMod`).
 * Absent/null = the normal ad-hoc builder.
 */
export type DiceIntent =
  | { kind: "death-save" }
  | { kind: "hit-die"; sides: number; conMod: number };

export interface DiceTrayProps {
  open: boolean;
  onClose: () => void;
  /** Apply an ad-hoc roll's total to HP as healing (manual — see plan §0). */
  onApplyHeal: (total: number) => void;
  /** When set, the tray opens locked to a single contextual roll (no builder). */
  intent?: DiceIntent | null;
  /** A death-save d20 settled — apply it (e.g. `hp.rollDeathSave(d20)`). */
  onDeathSave?: (d20: number) => void;
  /** A Hit Die settled and confirmed — heal by the rolled value (e.g. `hp.shortRest(roll)`). */
  onHitDie?: (roll: number) => void;
  /** Injected for tests; defaults to the shared production db. */
  db?: HpDb;
  /** Override `prefers-reduced-motion`; when reduced, rolls headless (no physics). */
  reducedMotion?: boolean;
}

/** Stable id for the dice canvas container — dice-box looks it up by selector. */
const CANVAS_ID = "hoard-dice-canvas";

/** The fixed notation for a contextual roll. */
function intentNotation(intent: DiceIntent): string {
  return intent.kind === "death-save" ? "1d20" : `1d${intent.sides}`;
}

/** Display-only outcome for a settled death-save d20 (the state change is applied by the parent). */
function deathSaveLabel(d20: number): string {
  if (d20 === 20) return "Natural 20 — revived at 1 HP!";
  if (d20 === 1) return "Natural 1 — two failures";
  return d20 >= 10 ? "Success" : "Failure";
}

/** Format a signed CON modifier for the heal-apply label: `+ 2`, `- 1`, or "". */
function conLabel(conMod: number): string {
  if (conMod === 0) return "";
  return conMod > 0 ? ` + ${conMod}` : ` - ${Math.abs(conMod)}`;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The full-screen "table throw" overlay (Variant B). Lazy-loads the 3D engine on
 * first open (skipped under reduced motion, which rolls headless), drives die/
 * modifier/advantage selection, shows the result + manual Apply-as-heal, and a
 * roll log. Inert when closed (display:none via [data-open]).
 *
 * With an {@link DiceIntent} it instead opens locked to a single contextual roll —
 * the death-save d20 or a short-rest Hit Die — recording it under the matching
 * `RollContext` and routing the settled value back through the parent (which owns
 * the 5e rule: tick a death-save pip, or heal `roll + CON`). One shared mechanic.
 */
export function DiceTray({
  open,
  onClose,
  onApplyHeal,
  intent,
  onDeathSave,
  onHitDie,
  db,
  reducedMotion,
}: DiceTrayProps) {
  const history = useDiceHistory(db);
  const reduced = reducedMotion ?? prefersReducedMotion();

  const [pool, setPool] = useState<DiePool>([]);
  const [modifier, setModifier] = useState(0); // remembered across opens (tray stays mounted)
  const [mode, setMode] = useState<RollMode>("normal");
  // The notation to roll AND the value of the editable expression field. Builder
  // actions write it; typing into the field overrides it (one field, no panel).
  const [notation, setNotation] = useState("");

  // Apply a builder change and keep the notation field in sync. Advantage only
  // survives for a lone d20, so it resets to normal for any other pool.
  const applyBuild = (next: { pool?: DiePool; modifier?: number; mode?: RollMode }) => {
    // Hand-edited field = "manual" mode: the typed notation no longer matches the
    // structured pool, so it's the source of truth and must NOT be rewritten by the
    // builder controls.
    const manual = notation.trim() !== "" && notation !== poolToNotation(pool, modifier, mode);
    if (manual && next.pool === undefined) {
      // A mode change (e.g. the still-enabled "Normal" button) must still update the
      // structured mode so a previously-pressed Advantage/Disadvantage can be reset
      // — but it leaves the typed notation alone. The modifier stepper stays fully
      // inert here (clobbering "4d6kh3!" or resurfacing a stray modifier on a later
      // add-die would surprise the user).
      if (next.mode !== undefined) setMode(advantageApplies(pool) ? next.mode : "normal");
      return;
    }

    const np = next.pool ?? pool;
    const nmod = next.modifier ?? modifier;
    const nmode = advantageApplies(np) ? next.mode ?? mode : "normal";
    setPool(np);
    setModifier(nmod);
    setMode(nmode);
    setNotation(poolToNotation(np, nmod, nmode));
  };

  const [record, setRecord] = useState<RollRecord | null>(null);
  const [rolling, setRolling] = useState(false);
  const [showLog, setShowLog] = useState(false);
  // Contextual-roll results: the settled die value. Death save applies immediately
  // (label only here); Hit Die waits for a deliberate Apply confirm before healing.
  const [deathSaveRoll, setDeathSaveRoll] = useState<number | null>(null);
  const [hitDieRoll, setHitDieRoll] = useState<number | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<DiceTrayEngine | null>(null);
  const loadingRef = useRef(false);
  // Bumped whenever the tray is closed/cleared, so a roll still settling in the
  // background can detect it was abandoned and discard its late result.
  const rollSeq = useRef(0);

  // Lazy-load the heavy 3D engine on first open (never at app start, never under
  // reduced motion). Loaded once and reused while the tray stays mounted.
  //
  // Fast open→close→reopen while the load is in flight: the close is a no-op (the
  // engine isn't created per-open), and the reopen sees `loadingRef` still true and
  // bails. The single load finishes and assigns `engineRef`, which is reused on the
  // next open. We deliberately DON'T cancel + discard the in-flight engine: `clear()`
  // only sweeps dice off the table, not the ResizeObserver / WebGL context, so
  // tearing down + re-initializing would leave a leaked, double-initialized tray.
  useEffect(() => {
    if (!open || reduced || engineRef.current || loadingRef.current || !canvasRef.current) return;
    loadingRef.current = true;
    // dice-box resolves its container with document.querySelector — pass the id
    // selector, not the element.
    createDiceTray(`#${CANVAS_ID}`)
      .then((engine) => {
        engineRef.current = engine;
      })
      .catch((err) => console.error("[hoard] dice engine failed to load", err))
      .finally(() => {
        loadingRef.current = false;
      });
  }, [open, reduced]);

  const doRoll = useCallback(
    async (expr: string, context: RollContext = "ad-hoc"): Promise<RollRecord | null> => {
      const seq = rollSeq.current; // this throw's generation; a close/clear bumps it
      setShowLog(false);
      setRolling(true);
      // Feel: a synthesized dice-clatter cue (mute-aware) + a short haptic, matching
      // the rest-control haptics. Reduced motion still gets the sound.
      playSfx("roll");
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(12);
      }
      try {
        let rec: RollRecord;
        if (reduced || !engineRef.current) {
          rec = rollHeadless(expr);
        } else {
          const engine = engineRef.current;
          // Safety: if the physics never settles (dice jam / engine hiccup), don't
          // hang on "Throwing" forever — fall back to a headless result after a
          // few seconds so the player always gets a number and the button resets.
          // Clear the timer once the engine wins the race so no stray headless roll
          // fires after a normal throw.
          let timer: ReturnType<typeof setTimeout> | undefined;
          let fireFallback!: (rec: RollRecord) => void;
          const timeout = new Promise<RollRecord>((res) => {
            fireFallback = res;
          });
          // The safety window measures IDLE time since the LAST settle, not total
          // time since the throw started: re-armed on every physics settle (incl.
          // each exploding re-roll) so a long but healthy explosion chain isn't cut
          // off — only a genuinely stuck throw (no settle for 6s) falls back (#149).
          const armTimer = () => {
            if (timer !== undefined) clearTimeout(timer);
            timer = setTimeout(() => {
              // Resolve the headless fallback FIRST so the race adopts it: clearing
              // the stuck throw below rejects `rollPromise` (via the adapter's
              // abandon), and that rejection must not win the race ahead of the
              // fallback — otherwise a jammed roll leaves the player empty-handed.
              fireFallback(rollHeadless(expr));
              // Then sweep the stuck throw so its eventual late settle can't resolve
              // a NEW throw with stale dice (dice-box has one result slot).
              engine.clear();
            }, 6000);
          };
          armTimer(); // initial window
          const rollPromise = engine.roll(expr, armTimer);
          // The adapter rejects this throw if a later one (or the timeout above)
          // supersedes it; swallow that so it never surfaces as an unhandled
          // rejection — the result we use comes from the race, and a late settle is
          // already guarded inside the engine.
          rollPromise.catch(() => {});
          try {
            rec = await Promise.race([rollPromise, timeout]);
          } finally {
            if (timer !== undefined) clearTimeout(timer);
          }
        }
        // Abandoned mid-roll (tray closed/cleared) — discard the late result so it
        // can't re-show or apply after the user already left this throw.
        if (rollSeq.current !== seq) return null;
        setRecord(rec);
        // History is a best-effort side log: a failed write (quota / private mode)
        // must NOT block the roll's gameplay outcome (death-save pip / Hit Die apply).
        void history.record(rec, { context }).catch((err) =>
          console.error("[hoard] dice history write failed", err),
        );
        return rec;
      } catch (err) {
        console.error("[hoard] dice roll failed", err);
        return null;
      } finally {
        // Only the CURRENT roll resets its own flag — an abandoned roll (tray cleared/
        // closed mid-throw, seq bumped) must not clobber a newer roll's "rolling".
        if (rollSeq.current === seq) setRolling(false);
      }
    },
    [reduced, history],
  );

  const rollNow = () => {
    const expr = notation.trim();
    if (expr) doRoll(expr, "ad-hoc");
  };

  // Tap the tray (the dimmed area) to clear the dice; ✕ / Escape closes it.
  const clearDice = useCallback(() => {
    rollSeq.current++; // invalidate any in-flight roll: a late settle must not re-show / apply it
    setRecord(null);
    setDeathSaveRoll(null);
    setHitDieRoll(null);
    // Recover immediately if cleared mid-roll — sweeping the dice means engine.roll()
    // may never settle, so don't leave the button stuck on "Throwing" until the timeout.
    setRolling(false);
    engineRef.current?.clear();
  }, []);
  const handleClose = useCallback(() => {
    clearDice();
    onClose();
  }, [onClose, clearDice]);

  // Contextual throw: roll the fixed notation under the intent's RollContext, then
  // route the settled die value back. Death save applies on settle; Hit Die defers
  // to a deliberate Apply confirm (so a stray throw never heals).
  const throwIntent = async () => {
    if (!intent) return;
    const rec = await doRoll(intentNotation(intent), intent.kind);
    if (!rec) return;
    const value = rec.result[0] ?? rec.total;
    if (intent.kind === "death-save") {
      setDeathSaveRoll(value);
      onDeathSave?.(value);
    } else {
      setHitDieRoll(value);
    }
  };

  const applyHitDie = () => {
    if (hitDieRoll == null) return;
    onHitDie?.(hitDieRoll);
    clearDice();
    onClose();
  };

  // Apply-as-heal closes the tray through the parent callback (which bypasses
  // handleClose), so clear the local result here too — otherwise the stale roll +
  // rendered dice reappear on the next open.
  const handleApplyHeal = useCallback(
    (total: number) => {
      clearDice();
      onApplyHeal(total);
    },
    [clearDice, onApplyHeal],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const ariaLabel =
    intent?.kind === "death-save"
      ? "Death save roll"
      : intent?.kind === "hit-die"
        ? "Hit Die roll"
        : "Dice tray";

  return (
    <div className="dice-tray" data-open={open} aria-hidden={!open} role="dialog" aria-modal="true" aria-label={ariaLabel}>
      {/* Tap-to-clear the dice in ad-hoc mode. Inert under an intent: clearing would
          reset the contextual outcome and let a second throw double-apply (a death
          save / Hit Die) — use Done / ✕ to leave instead. */}
      <div className="dice-tray__scrim" onClick={() => { if (!intent && !rolling) clearDice(); }} aria-hidden="true" />
      <IconButton variant="ghost" className="dice-tray__close" aria-label="Close dice" onClick={handleClose}>
        <Glyph name="close" />
      </IconButton>
      <button type="button" className="dice-tray__log" aria-label="Roll log" onClick={() => setShowLog((v) => !v)}>
        <Glyph name="log" />
        <span>log</span>
      </button>

      {/* The dice "field" is the full-WIDTH area ABOVE the dock — walls at the
          screen sides, floor at the dock's top edge — so dice land in view and
          never roll behind the controls. */}
      <div className="dice-tray__stage">
        <div className="dice-tray__canvas" id={CANVAS_ID} ref={canvasRef} aria-hidden="true" />
        {record && intent?.kind === "death-save" && (
          <div className="dice-result" role="status">
            <div className="dice-result__plate">
              <div className="dice-result__total">{deathSaveRoll ?? record.total}</div>
              <div className="dice-result__notation">Death save — {deathSaveLabel(deathSaveRoll ?? record.total)}</div>
            </div>
          </div>
        )}
        {record && intent?.kind === "hit-die" && (
          <div className="dice-result" data-heal role="status">
            <div className="dice-result__plate">
              <div className="dice-result__total">{hitDieRoll ?? record.total}</div>
              <div className="dice-result__notation">Hit Die — d{intent.sides}</div>
            </div>
          </div>
        )}
        {record && !intent && <DiceResult record={record} onApplyHeal={handleApplyHeal} />}
      </div>

      {showLog ? (
        <div className="dice-tray__sheet">
          <DiceHistory rolls={history.rolls} onClear={history.clear} onClose={() => setShowLog(false)} />
        </div>
      ) : intent ? (
        <div className="dice-tray__dock dice-tray__dock--intent">
          <span className="dice-tray__intent-label">
            {intent.kind === "death-save" ? "Death save" : `Hit Die — d${intent.sides}`}
          </span>
          {intent.kind === "death-save" && deathSaveRoll != null ? (
            // Death save already ticked its pip on settle — Done just closes.
            <Button variant="primary" size="lg" className="dice-throw" onClick={handleClose}>
              Done
            </Button>
          ) : intent.kind === "hit-die" && hitDieRoll != null ? (
            // A settled Hit Die's ONLY commit is Apply (spend + heal). No re-throw and
            // no discard-as-Done — both would hand out a free short-rest reroll by
            // tossing a low roll and reopening (Codex #130). It heals → heal variant.
            <Button variant="heal" size="lg" className="dice-throw" onClick={applyHitDie}>
              Apply {hitDieRoll}{conLabel(intent.conMod)} = {Math.max(0, hitDieRoll + intent.conMod)} heal
            </Button>
          ) : (
            <Button variant="primary" size="lg" className="dice-throw" onClick={throwIntent} disabled={rolling}>
              {rolling ? "Throwing…" : `Throw ${intentNotation(intent)}`}
            </Button>
          )}
        </div>
      ) : (
        <div className="dice-tray__dock">
          <DiceControls
            pool={pool}
            modifier={modifier}
            mode={mode}
            notation={notation}
            rolling={rolling}
            onAddDie={(s) => applyBuild({ pool: addToPool(pool, s) })}
            onRemoveDie={(s) => applyBuild({ pool: removeFromPool(pool, s) })}
            onClear={() => applyBuild({ pool: [] })}
            onSetMode={(m) => applyBuild({ mode: m })}
            onStepModifier={(d) => applyBuild({ modifier: modifier + d })}
            onNotationChange={setNotation}
            onRoll={rollNow}
          />
        </div>
      )}
    </div>
  );
}
