import { useEffect, type RefObject } from "react";

/** Focusable descendants of a dialog, in DOM order. Excludes disabled controls and hidden
 *  inputs, which can't take focus (a disabled first/last would break the wrap — Copilot #277). */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The standard modal-dialog focus contract (#262): trap Tab / Shift+Tab within `ref`'s
 * focusable descendants, and restore focus to whatever was focused before the dialog
 * opened when it unmounts (its trigger). Escape handling stays with each dialog — the
 * topmost owns it.
 *
 * Nested dialogs compose safely: a child (e.g. What's-new, portaled to <body>) is a
 * SEPARATE DOM subtree, so the parent's trap can't see the child's focusables and no-ops
 * while focus lives in the child — only the topmost dialog actually traps.
 */
export function useDialogFocus(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !ref.current) return;
      const f = ref.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (f.length === 0) return;
      const first = f[0]!;
      const last = f[f.length - 1]!;
      const active = document.activeElement;
      // Focus escaped to the page body (e.g. a focused control unmounted) — pull it back
      // into the dialog (Codex #277). Guarded to `body` SPECIFICALLY so a parent dialog
      // never yanks focus out of an open CHILD dialog (whose focus lives in its own
      // subtree, never on body) — that's what keeps nested dialogs composing.
      if (active === document.body) {
        e.preventDefault();
        first.focus();
        return;
      }
      // Only wrap when focus is at an edge of THIS dialog; otherwise let it move
      // normally (and let a child dialog's own trap handle its focus).
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      returnTo?.focus?.();
    };
  }, [ref]);
}
