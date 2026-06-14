import type { DyingStatus } from "../domain/deathSaves";

export interface DeathSavesProps {
  successes: number;
  failures: number;
  status: DyingStatus;
  onSetSuccesses: (n: number) => void;
  onSetFailures: (n: number) => void;
  onRoll: () => void;
}

/** A short, staccato "rattle" so a death-save roll feels different from a tap. */
function rollHaptic() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate([14, 36, 14]);
  }
}

function pipHaptic() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(8);
  }
}

type Track = "success" | "failure";

interface PipRowProps {
  kind: Track;
  filled: number;
  locked: boolean;
  onSet: (n: number) => void;
}

/** Three tappable pips. Tapping pip i sets the track to i; tapping the current
 *  top pip clears it back to i-1, so a track is fully thumb-driven. */
function PipRow({ kind, filled, locked, onSet }: PipRowProps) {
  return (
    <div className="death-saves__track" data-kind={kind}>
      <span className="death-saves__track-label">
        {kind === "success" ? "Successes" : "Failures"}
      </span>
      <div className="death-saves__pips" role="group" aria-label={`${kind} pips`}>
        {[1, 2, 3].map((i) => {
          const isFilled = i <= filled;
          return (
            <button
              key={i}
              type="button"
              className="death-saves__pip"
              data-kind={kind}
              data-filled={isFilled}
              aria-label={`${kind === "success" ? "Success" : "Failure"} ${i}`}
              aria-pressed={isFilled}
              disabled={locked}
              onClick={() => {
                pipHaptic();
                onSet(i === filled ? i - 1 : i);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * The death-save panel: two pip tracks (glowing-green successes, ember-red
 * failures) and a d20 roll. Surfaces only while a creature is down (status !==
 * "alive"); STABILIZED / DEAD lock the controls. Presentational — values in,
 * callbacks out.
 */
export function DeathSaves({
  successes,
  failures,
  status,
  onSetSuccesses,
  onSetFailures,
  onRoll,
}: DeathSavesProps) {
  const terminal = status === "stable" || status === "dead";

  return (
    <section className="death-saves" data-status={status} aria-label="Death saving throws">
      <header className="death-saves__heading">
        <span className="death-saves__title">Death Saves</span>
        {status === "stable" && (
          <span className="death-saves__banner" data-kind="stable" role="status">
            Stabilized
          </span>
        )}
        {status === "dead" && (
          <span className="death-saves__banner" data-kind="dead" role="status">
            Dead
          </span>
        )}
      </header>

      <PipRow kind="success" filled={successes} locked={terminal} onSet={onSetSuccesses} />
      <PipRow kind="failure" filled={failures} locked={terminal} onSet={onSetFailures} />

      <button
        type="button"
        className="death-saves__roll"
        disabled={terminal}
        onClick={() => {
          rollHaptic();
          onRoll();
        }}
      >
        <span className="death-saves__die" aria-hidden="true">
          d20
        </span>
        <span>Roll Death Save</span>
      </button>
    </section>
  );
}
