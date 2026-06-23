import "./styles.css";
import "./App.css";
import "./sound/sound.css";
import "./ui/dice/dice.css";
import { useEffect, useRef, useState } from "react";
import { playSfx } from "./sound/sfx";
import { useSoundEnabled } from "./sound/soundSettings";
import { useHp } from "./store/useHp";
import type { HpLastChange } from "./store/useHp";
import { useCoins } from "./store/useCoins";
import { useSaveError, clearSaveError } from "./store/saveError";
import { CharacterName } from "./ui/CharacterName";
import { UpdateToast } from "./ui/UpdateToast";
import { ConcentrationPrompt } from "./ui/ConcentrationPrompt";
import { DeathSaves } from "./ui/DeathSaves";
import { HitDicePanel } from "./ui/HitDicePanel";
import { tierFor } from "./ui/HpBar";
import { glowCss, hpColor, rgbCss } from "./ui/hpColor";
import { HpKeypad } from "./ui/HpKeypad";
import { HpValueEditor } from "./ui/HpValueEditor";
import { LiquidVessel } from "./ui/LiquidVessel";
import { RadialHub } from "./ui/RadialHub";
import { RestControls } from "./ui/RestControls";
import { AboutPanel } from "./ui/AboutPanel";
import { UndoPill } from "./ui/UndoPill";
import { CoinSheet } from "./ui/CoinSheet";
import { DiceTray, type DiceIntent } from "./ui/dice/DiceTray";

/**
 * The composed HP Tracker: reactive state from `useHp` flows into the
 * presentational Obsidian UI. The shell carries `data-tier` so the signature
 * halo (and the accent it tints) shifts colour with the party's health. Tapping
 * a value opens the quick-entry keypad (current/temp) or the pill editor (max).
 */
export function App() {
  const hp = useHp();
  const { current, max, temp } = hp;
  const dying = hp.status !== "alive";
  const [editingMax, setEditingMax] = useState(false);
  const [keypadOpen, setKeypadOpen] = useState(false);
  const coins = useCoins();
  const saveFailed = useSaveError();
  const [coinsOpen, setCoinsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [soundEnabled, toggleSound] = useSoundEnabled();
  // Toggle-on cue only when ENABLING (playSfx self-gates on mute, so muting is
  // silent); the override updates synchronously so the cue actually sounds.
  const onToggleSound = () => {
    const willEnable = !soundEnabled;
    toggleSound();
    if (willEnable) playSfx("toggleOn");
  };
  const [diceOpen, setDiceOpen] = useState(false);
  // The active dice-tray intent: null = ad-hoc builder; otherwise a contextual roll
  // (death save / Hit Die) whose 5e rule the app applies on settle.
  const [diceIntent, setDiceIntent] = useState<DiceIntent | null>(null);
  const openDice = (intent: DiceIntent | null = null) => {
    setKeypadOpen(false);
    setEditingMax(false);
    setCoinsOpen(false);
    setDiceIntent(intent);
    setDiceOpen(true);
  };

  // The panel slot is a shared scroll container for Hit Dice and Death Saves.
  // Reset its scroll whenever the two swap, so the incoming panel starts at the
  // top of the slot instead of a stale offset left by the outgoing one.
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0;
  }, [dying]);

  // Dramatic status cues: a chime on stabilize, a knell on death. Gated until the
  // persisted record has hydrated, and the first hydrated status is taken as the
  // baseline — so reopening the app in a terminal state never fires a pre-gesture
  // sound. The engine self-gates on mute, so these calls are otherwise unconditional.
  const prevStatus = useRef(hp.status);
  const baselined = useRef(false);
  const statusCueTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!hp.hydrated) return;
    if (!baselined.current) {
      prevStatus.current = hp.status;
      baselined.current = true;
      return;
    }
    if (hp.status !== prevStatus.current) {
      if (hp.status === "stable") playSfx("stabilize");
      else if (hp.status === "dead") playSfx("death");
      // Boundary crossings (alive↔0) also fire the damage/heal cue from the same
      // gesture, so STAGGER the status cue ~140ms to layer after it rather than mask
      // it (sound-design.md "never double-fire" — Codex #162). Hold the timer id so a
      // status change WITHIN the window cancels the now-stale cue (cleanup below) —
      // e.g. a quick heal/undo, or 3 failures → dead, mustn't trail a late "down".
      else if (hp.status === "dying" && prevStatus.current === "alive") statusCueTimer.current = setTimeout(() => playSfx("down"), 140);
      else if (hp.status === "alive") statusCueTimer.current = setTimeout(() => playSfx("revive"), 140);
      prevStatus.current = hp.status;
    }
    return () => clearTimeout(statusCueTimer.current); // cancel a still-pending staggered cue
  }, [hp.hydrated, hp.status]);


  const undoLabel = (lc: NonNullable<HpLastChange>) =>
    lc.kind === "damage" ? `Took ${lc.amount}`
    : lc.kind === "heal" ? `Healed +${lc.amount}`
    : lc.kind === "temp" ? `Temp ${lc.amount}`
    : `Set to ${lc.amount}`;

  // Continuous HP colour drives the signature halo / accent so the whole frame
  // fades with HP instead of snapping at the tier thresholds (the data-tier
  // attribute stays as a no-JS fallback).
  const accent = hpColor(current, max);
  const accentStyle = { "--accent": rgbCss(accent), "--accent-glow": glowCss(accent) } as React.CSSProperties;

  return (
    <main className="hp-tracker" data-tier={tierFor(current, max)} style={accentStyle}>
      {saveFailed && (
        <div className="save-error" role="alert">
          <span>Couldn't save — your last change may not have persisted.</span>
          <button type="button" className="save-error__dismiss" aria-label="Dismiss" onClick={clearSaveError}>
            ×
          </button>
        </div>
      )}
      <UpdateToast />
      <div className="hp-tracker__chrome">
        <RadialHub
          onCoins={() => { setKeypadOpen(false); setEditingMax(false); setCoinsOpen(true); }}
          onDice={() => openDice(null)}
          onAbout={() => setAboutOpen(true)}
          concentrating={hp.concentrating}
          onToggleConcentration={() => {
            const willConcentrate = !hp.concentrating;
            // Cue from THIS gesture (not a later effect) so the first sound satisfies
            // browser autoplay (Codex #158). A downed enable is a no-op in useHp
            // (current ≤ 0) — skip the cue so a rejected toggle stays silent.
            if (!(willConcentrate && dying)) playSfx(willConcentrate ? "toggleOn" : "toggleOff");
            hp.setConcentrating(!hp.concentrating);
          }}
          soundEnabled={soundEnabled}
          onToggleSound={onToggleSound}
        />
      </div>
      <div className="hp-tracker__card">
      <CharacterName name={hp.name} onSetName={hp.setName} />
      <div className="hp-tracker__stage">
        <LiquidVessel
          current={current}
          max={max}
          temp={temp}
          onEditCurrent={() => { setEditingMax(false); setCoinsOpen(false); setKeypadOpen(true); }}
          onEditMax={() => { setKeypadOpen(false); setCoinsOpen(false); setEditingMax(true); }}
          onEditTemp={() => { setEditingMax(false); setCoinsOpen(false); setKeypadOpen(true); }}
          onDamage={(n) => { playSfx("damage"); return hp.damage(n); }}
          onHeal={(n) => { playSfx("heal"); return hp.heal(n); }}
        />
      </div>
      {/* The swappable panel lives in its own fixed-height slot so the
          DeathSaves↔HitDicePanel height difference never re-centres the orb. */}
      <div className="hp-tracker__panel" ref={panelRef}>
        {dying ? (
          <DeathSaves
            successes={hp.successes}
            failures={hp.failures}
            status={hp.status}
            onSetSuccesses={hp.setSuccesses}
            onSetFailures={hp.setFailures}
            onRoll={() => openDice({ kind: "death-save" })}
          />
        ) : (
          <HitDicePanel
            size={hp.hitDieSize}
            total={hp.hitDiceTotal}
            available={hp.hitDiceAvailable}
            conMod={hp.conMod}
            onSetSize={hp.setHitDieSize}
            onSetTotal={hp.setHitDiceTotal}
            onSetAvailable={hp.setHitDiceAvailable}
            onSetConMod={hp.setConMod}
          />
        )}
      </div>
      <div className="hp-tracker__footer">
        {/* Damage/heal is the orb itself now: drag down/up, or tap to open the
            keypad (the desktop click path). Only rests live down here. */}
        <RestControls
          hitDiceAvailable={hp.hitDiceAvailable}
          onShortRest={() => openDice({ kind: "hit-die", sides: hp.hitDieSize, conMod: hp.conMod })}
          onLongRest={() => {
            playSfx("longRest");
            return hp.longRest();
          }}
        />
      </div>
      </div>

      {keypadOpen && (
        <HpKeypad
          current={current}
          max={max}
          temp={temp}
          onDamage={(n) => { playSfx("damage"); return hp.damage(n); }}
          onHeal={(n) => { playSfx("heal"); return hp.heal(n); }}
          onSetCurrent={hp.setCurrent}   // no sfx — direct set is a secondary action
          onSetTemp={hp.setTempValue}    // no sfx — idem
          onClose={() => setKeypadOpen(false)}
        />
      )}

      {editingMax && (
        <HpValueEditor
          label="Max HP"
          value={max}
          onDecrement={() => hp.stepMax(-1)}
          onIncrement={() => hp.stepMax(1)}
          onSet={hp.setMax}
          onClose={() => setEditingMax(false)}
        />
      )}

      {coinsOpen && (
        <CoinSheet
          pp={coins.pp} gp={coins.gp} sp={coins.sp} cp={coins.cp} total={coins.total}
          onAdd={coins.add} onSpend={coins.spend} onSet={coins.set}
          onDistill={coins.distill}
          lastDistill={coins.lastDistill}
          onUndoDistill={coins.undoDistill}
          onDismissDistill={coins.dismissDistill}
          onClose={() => { coins.dismissDistill(); setCoinsOpen(false); }}
        />
      )}

      {aboutOpen && <AboutPanel onClose={() => setAboutOpen(false)} />}

      {/* Always mounted so it's inert-when-closed (display:none) rather than
          remounting — keeps the lazy-loaded 3D engine warm between opens. */}
      <DiceTray
        open={diceOpen}
        intent={diceIntent}
        onClose={() => { setDiceOpen(false); setDiceIntent(null); }}
        onApplyHeal={(n) => { playSfx("heal"); setDiceOpen(false); return hp.heal(n); }}
        onDeathSave={(d20) => hp.rollDeathSave(d20)}
        onHitDie={(roll) => { playSfx("heal"); hp.shortRest(roll); }}
      />

      {hp.lastChange && (
        <UndoPill
          label={undoLabel(hp.lastChange)}
          onUndo={hp.undo}
          onDismiss={hp.dismissLastChange}
        />
      )}

      {hp.concentrationCheck && (
        <ConcentrationPrompt
          dc={hp.concentrationCheck.dc}
          onDismiss={hp.dismissConcentrationCheck}
          onDrop={() => {
            hp.dismissConcentrationCheck();
            hp.setConcentrating(false);
          }}
        />
      )}
    </main>
  );
}
