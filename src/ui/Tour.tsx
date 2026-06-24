import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./controls";
import { markTourSeen, type TourStep } from "./tour";
import "./Tour.css";

interface TourProps {
  steps: TourStep[];
  /** localStorage key for the persisted "seen" flag. */
  seenKey: string;
  /** Called when the tour ends (completed or skipped). */
  onClose: () => void;
}

/**
 * The reusable guided-tour engine (#177): a dimming scrim with a spotlight cut over the
 * current step's target element, a caption card with Next/Back/Skip + progress dots, and
 * a persisted "seen" flag so it doesn't re-show. Dialog semantics + focus + Escape (skip);
 * reduced-motion via CSS. Portaled to body so it overlays the whole app. #178–#181 drive
 * it with real step content + the first-run trigger.
 */
export function Tour({ steps, seenKey, onClose }: TourProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  // Stable (deps: seenKey/onClose) so the keydown effect has no stale closure (Copilot).
  const end = useCallback(() => {
    markTourSeen(seenKey);
    onClose();
  }, [seenKey, onClose]);
  const next = () => (isLast ? end() : setIndex((i) => i + 1));
  const back = () => setIndex((i) => Math.max(0, i - 1));

  // Measure the spotlight target each step (layout effect so the cut is placed before paint).
  useLayoutEffect(() => {
    if (!step) return;
    const el = document.querySelector(step.target);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);

  // Restore focus to the element that launched the tour when it closes (Copilot a11y).
  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    return () => returnFocusRef.current?.focus?.();
  }, []);

  // Focus the card on each step; Escape skips; Tab is trapped inside the card so the
  // dimmed background controls aren't keyboard-reachable while the tour is open (Codex).
  useEffect(() => {
    cardRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        end();
        return;
      }
      if (e.key === "Tab" && cardRef.current) {
        const f = cardRef.current.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        );
        if (f.length === 0) return;
        const first = f[0]!;
        const last = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, end]);

  if (!step) return null;

  const spotlight = rect
    ? { top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }
    : undefined;
  // Put the caption card on the OPPOSITE half from the spotlight, so it never covers the
  // control it's pointing at — e.g. the bottom rest controls would sit under a bottom-pinned
  // card. When the target's centre is in the lower half, the card flips to the top.
  const cardAtTop =
    rect != null && typeof window !== "undefined" && rect.top + rect.height / 2 > window.innerHeight / 2;

  return createPortal(
    <div className="tour" role="dialog" aria-modal="true" aria-label="Feature tour">
      {/* Full-screen blocker so taps on the dimmed area DON'T reach the app behind — the
          spotlight's box-shadow is paint only and wouldn't capture them (Codex). */}
      <div className="tour__block" data-testid="tour-block" aria-hidden="true" />
      {/* The spotlight's huge box-shadow IS the dim; a plain scrim covers the no-target
          case. Both are visual only (pointer-events:none) — the blocker handles clicks. */}
      {rect ? (
        <div className="tour__spotlight" data-testid="tour-spotlight" style={spotlight} aria-hidden="true" />
      ) : (
        <div className="tour__scrim" aria-hidden="true" />
      )}
      <div
        className="tour__card"
        data-pos={cardAtTop ? "top" : "bottom"}
        ref={cardRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {step.title && <h3 className="tour__title">{step.title}</h3>}
        <p className="tour__caption" aria-live="polite">{step.caption}</p>
        <div className="tour__dots" aria-hidden="true">
          {steps.map((_, i) => (
            <span key={i} className={`tour__dot${i === index ? " is-active" : ""}`} />
          ))}
        </div>
        <div className="tour__nav">
          <button type="button" className="tour__skip" onClick={end}>
            Skip
          </button>
          <div className="tour__navbtns">
            {!isFirst && (
              <Button variant="ghost" onClick={back}>
                Back
              </Button>
            )}
            <Button variant="primary" onClick={next}>
              {isLast ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
