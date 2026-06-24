import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  const end = () => {
    markTourSeen(seenKey);
    onClose();
  };
  const next = () => (isLast ? end() : setIndex((i) => i + 1));
  const back = () => setIndex((i) => Math.max(0, i - 1));

  // Measure the spotlight target each step (layout effect so the cut is placed before paint).
  useLayoutEffect(() => {
    if (!step) return;
    const el = document.querySelector(step.target);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);

  // Focus the card on each step; Escape skips (stopped before any app-level handler).
  useEffect(() => {
    cardRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        end();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // end/index are intentionally the deps; end closes over current state via setIndex updater.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (!step) return null;

  const spotlight = rect
    ? { top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }
    : undefined;

  return createPortal(
    <div className="tour" role="dialog" aria-modal="true" aria-label="Feature tour">
      {/* The spotlight's huge box-shadow IS the dim; a plain scrim covers the no-target case. */}
      {rect ? (
        <div className="tour__spotlight" data-testid="tour-spotlight" style={spotlight} onClick={end} />
      ) : (
        <div className="tour__scrim" onClick={end} />
      )}
      <div className="tour__card" ref={cardRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
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
