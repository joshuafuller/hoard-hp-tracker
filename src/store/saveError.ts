/**
 * Tiny module-level "a persistent write failed" signal (#101).
 *
 * HP/coin actions are fire-and-forget (`onClick={() => hp.damage(n)}`), so a
 * rejected promise would just become an unhandled rejection — the UI couldn't
 * "react". Instead the store reports a save failure here, and the app surfaces a
 * dismissible banner. Framework-light: a module flag + listeners, read via
 * `useSyncExternalStore`.
 */
import { useSyncExternalStore } from "react";

let failed = false;
const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};

/** Flag that a write could not be persisted (after the reopen-and-retry also failed). */
export function reportSaveError(): void {
  if (!failed) {
    failed = true;
    emit();
  }
}

/** Clear the flag (user dismissed the banner, or a later write succeeded). */
export function clearSaveError(): void {
  if (failed) {
    failed = false;
    emit();
  }
}

/** Reactively read whether the last persistence attempt failed. */
export function useSaveError(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => failed,
    () => false,
  );
}
