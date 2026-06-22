import { useCallback, useState } from "react";

/**
 * The mute preference for the optional HP-tracker sound effects (#56).
 *
 * Sound is ON by default but fully toggleable; the *muted* flag is what we
 * persist (absent key ⇒ not muted ⇒ sound enabled). The engine consults
 * `isSoundEnabled()` on every play so a flipped toggle takes effect instantly,
 * and `useSoundEnabled()` drives the visible toggle button.
 */

/** localStorage key holding the persisted muted flag ("true"/"false"). */
export const MUTE_STORAGE_KEY = "hoard-hp-muted";

/**
 * Read the persisted muted flag, tolerating environments where localStorage is
 * missing or throws (SSR, private mode). Defaults to not-muted.
 */
function readMuted(): boolean {
  try {
    return globalThis.localStorage?.getItem(MUTE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/** Persist the muted flag, silently ignoring storage failures. */
function writeMuted(muted: boolean): void {
  try {
    globalThis.localStorage?.setItem(MUTE_STORAGE_KEY, String(muted));
  } catch {
    /* best-effort: a failed write just means the pref won't persist */
  }
}

/**
 * In-memory authoritative muted state, set the moment the user toggles. The
 * engine consults this FIRST so a flipped toggle is effective immediately even
 * when persistence fails (private mode / quota). `undefined` ⇒ no toggle yet ⇒
 * fall back to the persisted flag.
 */
let muteOverride: boolean | undefined;

/** Set the live muted preference (authoritative in-memory; best-effort persist). */
function setMuted(muted: boolean): void {
  muteOverride = muted;
  writeMuted(muted);
}

/** Test helper: clear the in-memory override (pair with localStorage.clear()). */
export function __resetSoundPreference(): void {
  muteOverride = undefined;
}

/**
 * Plain getter the sound engine checks before synthesizing a tone. Returns the
 * *enabled* state (inverse of muted); prefers the live in-memory preference and
 * falls back to the persisted flag. Default ON.
 */
export function isSoundEnabled(): boolean {
  return !(muteOverride ?? readMuted());
}

/**
 * React state for the visible toggle. Returns the current enabled flag and a
 * toggle that flips it, sharing the new value with the engine (in-memory) and
 * persisting best-effort.
 */
export function useSoundEnabled(): readonly [enabled: boolean, toggle: () => void] {
  const [enabled, setEnabled] = useState<boolean>(() => isSoundEnabled());

  const toggle = useCallback(() => {
    // Update the authoritative in-memory override SYNCHRONOUSLY (not inside the
    // setState updater, which defers to commit) so the engine — and any cue fired
    // right after toggle() — sees the new mute state immediately.
    const next = !isSoundEnabled();
    setMuted(!next);
    setEnabled(next);
  }, []);

  return [enabled, toggle] as const;
}
