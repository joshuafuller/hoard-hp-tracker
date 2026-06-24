import { useEffect, type RefObject } from "react";

/** Focusable descendants of a dialog, in DOM order. */
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

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
