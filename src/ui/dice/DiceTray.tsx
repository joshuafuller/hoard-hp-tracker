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

  // Adding/removing dice can invalidate advantage (only a lone d20 qualifies) —
  // reset the mode to normal whenever the pool stops being a lone d20.
  const updatePool = (next: DiePool) => {
    setPool(next);
    if (!advantageApplies(next)) setMode("normal");
  };
  const [record, setRecord] = useState<RollRecord | null>(null);
  const [rolling, setRolling] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [notationOpen, setNotationOpen] = useState(false);
  const [notationText, setNotationText] = useState("");

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
    async (notation: string) => {
      setShowLog(false);
      setRolling(true);
      try {
        const rec =
          reduced || !engineRef.current ? rollHeadless(notation) : await engineRef.current.roll(notation);
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

  const rollFromChips = () => {
    const notation = poolToNotation(pool, modifier, mode);
    if (notation) doRoll(notation);
  };
  const submitNotation = (e: React.FormEvent) => {
    e.preventDefault();
    const n = notationText.trim();
    if (n) doRoll(n);
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
      <button type="button" className="dice-tray__close" aria-label="Close dice" onClick={handleClose}>
        ✕
      </button>
      <button type="button" className="dice-tray__log" aria-label="Roll log" onClick={() => setShowLog((v) => !v)}>
        ⟲ log
      </button>

      <div className="dice-tray__stage">
        <div className="dice-tray__canvas" id={CANVAS_ID} ref={canvasRef} aria-hidden="true" />
        {record && <DiceResult record={record} onApplyHeal={onApplyHeal} />}
      </div>

      {showLog ? (
        <div className="dice-tray__sheet">
          <DiceHistory rolls={history.rolls} onClear={history.clear} />
        </div>
      ) : (
        <div className="dice-tray__dock">
          {notationOpen ? (
            <form className="dice-notation" onSubmit={submitNotation}>
              <input
                className="dice-notation__input"
                aria-label="Dice notation"
                placeholder="2d6+1d4+3"
                value={notationText}
                autoFocus
                onChange={(e) => setNotationText(e.target.value)}
              />
              <button type="submit" className="dice-notation__go" disabled={rolling}>
                Throw
              </button>
              <button type="button" className="dice-notation__back" aria-label="Back to dice" onClick={() => setNotationOpen(false)}>
                ◂
              </button>
            </form>
          ) : (
            <DiceControls
              pool={pool}
              modifier={modifier}
              mode={mode}
              rolling={rolling}
              onAddDie={(s) => updatePool(addToPool(pool, s))}
              onRemoveDie={(s) => updatePool(removeFromPool(pool, s))}
              onClear={() => updatePool([])}
              onSetMode={setMode}
              onStepModifier={(d) => setModifier((m) => m + d)}
              onRoll={rollFromChips}
              onOpenNotation={() => setNotationOpen(true)}
            />
          )}
        </div>
      )}
    </div>
  );
}
