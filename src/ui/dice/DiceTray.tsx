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
import { type HpDb } from "../../store/db";
import { useDiceHistory } from "../../store/useDiceHistory";
import { playSfx } from "../../sound/sfx";
import { createDiceTray, rollHeadless, type DiceTray as DiceTrayEngine } from "./diceEngine";
import { DiceControls } from "./DiceControls";
import { DiceResult } from "./DiceResult";
import { DiceHistory } from "./DiceHistory";

export interface DiceTrayProps {
  open: boolean;
  onClose: () => void;
  /** Apply an ad-hoc roll's total to HP as healing (manual — see plan §0). */
  onApplyHeal: (total: number) => void;
  /** Injected for tests; defaults to the shared production db. */
  db?: HpDb;
  /** Override `prefers-reduced-motion`; when reduced, rolls headless (no physics). */
  reducedMotion?: boolean;
}

/** Stable id for the dice canvas container — dice-box looks it up by selector. */
const CANVAS_ID = "hoard-dice-canvas";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The full-screen "table throw" overlay (Variant B). Lazy-loads the 3D engine on
 * first open (skipped under reduced motion, which rolls headless), drives die/
 * modifier/advantage selection, shows the result + manual Apply-as-heal, and a
 * roll log. Inert when closed (display:none via [data-open]). The death-save and
 * Hit-Die contexts route through this same tray (added in the integration step).
 */
export function DiceTray({ open, onClose, onApplyHeal, db, reducedMotion }: DiceTrayProps) {
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

  const canvasRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<DiceTrayEngine | null>(null);
  const loadingRef = useRef(false);

  // Lazy-load the heavy 3D engine on first open (never at app start, never under
  // reduced motion). Loaded once and reused while the tray stays mounted.
  useEffect(() => {
    if (!open || reduced || engineRef.current || loadingRef.current || !canvasRef.current) return;
    loadingRef.current = true;
    let cancelled = false;
    // dice-box resolves its container with document.querySelector — pass the id
    // selector, not the element.
    createDiceTray(`#${CANVAS_ID}`)
      .then((engine) => {
        if (cancelled) return;
        engineRef.current = engine;
      })
      .catch((err) => console.error("[hoard] dice engine failed to load", err))
      .finally(() => {
        loadingRef.current = false;
      });
    return () => {
      cancelled = true;
    };
  }, [open, reduced]);

  const doRoll = useCallback(
    async (expr: string) => {
      setShowLog(false);
      setRolling(true);
      // Feel: a synthesized dice-clatter cue (mute-aware) + a short haptic, matching
      // the rest-control haptics. Reduced motion still gets the sound.
      playSfx("roll");
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(12);
      }
      try {
        const rec = reduced || !engineRef.current ? rollHeadless(expr) : await engineRef.current.roll(expr);
        setRecord(rec);
        await history.record(rec, { context: "ad-hoc" });
      } catch (err) {
        console.error("[hoard] dice roll failed", err);
      } finally {
        setRolling(false);
      }
    },
    [reduced, history],
  );

  const rollNow = () => {
    const expr = notation.trim();
    if (expr) doRoll(expr);
  };

  // Tap the tray (the dimmed area) to clear the dice; ✕ / Escape closes it.
  const clearDice = () => {
    setRecord(null);
    engineRef.current?.clear();
  };
  const handleClose = useCallback(() => {
    clearDice();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  return (
    <div className="dice-tray" data-open={open} aria-hidden={!open} role="dialog" aria-modal="true" aria-label="Dice tray">
      <div className="dice-tray__scrim" onClick={clearDice} aria-hidden="true" />
      {/* Full-screen dice canvas — the whole screen IS the tray (walls at the
          edges), with the controls floating on top. */}
      <div className="dice-tray__canvas" id={CANVAS_ID} ref={canvasRef} aria-hidden="true" />
      <button type="button" className="dice-tray__close" aria-label="Close dice" onClick={handleClose}>
        ✕
      </button>
      <button type="button" className="dice-tray__log" aria-label="Roll log" onClick={() => setShowLog((v) => !v)}>
        ⟲ log
      </button>

      <div className="dice-tray__stage">
        {record && <DiceResult record={record} onApplyHeal={onApplyHeal} />}
      </div>

      {showLog ? (
        <div className="dice-tray__sheet">
          <DiceHistory rolls={history.rolls} onClear={history.clear} />
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
