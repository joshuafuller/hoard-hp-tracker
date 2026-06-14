import "./styles.css";
import "./App.css";
import "./sound/sound.css";
import { useEffect, useRef, useState } from "react";
import { playSfx } from "./sound/sfx";
import { useHp } from "./store/useHp";
import { DeathSaves } from "./ui/DeathSaves";
import { HitDicePanel } from "./ui/HitDicePanel";
import { tierFor } from "./ui/HpBar";
import { HpValueEditor } from "./ui/HpValueEditor";
import { LiquidVessel } from "./ui/LiquidVessel";
import { RestControls } from "./ui/RestControls";
import { SoundToggle } from "./ui/SoundToggle";
import { StepControls } from "./ui/StepControls";

/** Which HP value the pill editor is currently editing. */
type EditTarget = "current" | "max" | "temp";

/**
 * The composed HP Tracker: reactive state from `useHp` flows into the
 * presentational Obsidian UI. The shell carries `data-tier` so the signature
 * halo (and the accent it tints) shifts colour with the party's health. Tapping
 * a value opens the pill editor modal.
 */
export function App() {
  const hp = useHp();
  const { current, max, temp } = hp;
  const dying = hp.status !== "alive";
  const [editing, setEditing] = useState<EditTarget | null>(null);

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

  const editors: Record<
    EditTarget,
    { label: string; value: number; dec: () => void; inc: () => void; set: (n: number) => void }
  > = {
    current: {
      label: "Current HP",
      value: current,
      dec: () => hp.stepCurrent(-1),
      inc: () => hp.stepCurrent(1),
      set: hp.setCurrent,
    },
    max: {
      label: "Max HP",
      value: max,
      dec: () => hp.stepMax(-1),
      inc: () => hp.stepMax(1),
      set: hp.setMax,
    },
    temp: {
      label: "Temp HP",
      value: temp,
      dec: () => hp.stepTemp(-1),
      inc: () => hp.stepTemp(1),
      set: hp.setTempValue,
    },
  };
  const active = editing ? editors[editing] : null;

  return (
    <main className="hp-tracker" data-tier={tierFor(current, max)}>
      <div className="hp-tracker__chrome">
        <SoundToggle />
      </div>
      <div className="hp-tracker__stage">
        <LiquidVessel
          current={current}
          max={max}
          temp={temp}
          onEditCurrent={() => setEditing("current")}
          onEditMax={() => setEditing("max")}
          onEditTemp={() => setEditing("temp")}
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

      {active && (
        <HpValueEditor
          label={active.label}
          value={active.value}
          onDecrement={active.dec}
          onIncrement={active.inc}
          onSet={active.set}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  );
}
