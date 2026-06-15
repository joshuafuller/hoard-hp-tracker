import "./styles.css";
import "./App.css";
import "./sound/sound.css";
import { useEffect, useRef, useState } from "react";
import { playSfx } from "./sound/sfx";
import { useHp } from "./store/useHp";
import type { HpLastChange } from "./store/useHp";
import { CharacterName } from "./ui/CharacterName";
import { DeathSaves } from "./ui/DeathSaves";
import { HitDicePanel } from "./ui/HitDicePanel";
import { tierFor } from "./ui/HpBar";
import { glowCss, hpColor, rgbCss } from "./ui/hpColor";
import { HpKeypad } from "./ui/HpKeypad";
import { HpValueEditor } from "./ui/HpValueEditor";
import { LiquidVessel } from "./ui/LiquidVessel";
import { RestControls } from "./ui/RestControls";
import { SoundToggle } from "./ui/SoundToggle";
import { StepControls } from "./ui/StepControls";
import { UndoPill } from "./ui/UndoPill";

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
      prevStatus.current = hp.status;
    }
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
      <div className="hp-tracker__chrome">
        <SoundToggle />
      </div>
      <CharacterName name={hp.name} onSetName={hp.setName} />
      <div className="hp-tracker__stage">
        <LiquidVessel
          current={current}
          max={max}
          temp={temp}
          onEditCurrent={() => { setEditingMax(false); setKeypadOpen(true); }}
          onEditMax={() => { setKeypadOpen(false); setEditingMax(true); }}
          onEditTemp={() => { setEditingMax(false); setKeypadOpen(true); }}
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
            onRoll={() => {
              playSfx("roll");
              return hp.rollDeathSave();
            }}
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
        {!keypadOpen && (
          <StepControls
            onDamage={(n) => {
              playSfx("damage");
              return hp.damage(n);
            }}
            onHeal={(n) => {
              playSfx("heal");
              return hp.heal(n);
            }}
          />
        )}
        <RestControls
          hitDiceAvailable={hp.hitDiceAvailable}
          onShortRest={() => {
            playSfx("shortRest");
            return hp.shortRest();
          }}
          onLongRest={() => {
            playSfx("longRest");
            return hp.longRest();
          }}
        />
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

      {hp.lastChange && (
        <UndoPill
          label={undoLabel(hp.lastChange)}
          onUndo={hp.undo}
          onDismiss={hp.dismissLastChange}
        />
      )}
    </main>
  );
}
