import { useEffect, useRef } from "react";

export interface UndoPillProps {
  /** Short description of the last change, e.g. "Healed +9". */
  label: string;
  /** Revert the last change. */
  onUndo: () => void;
  /** Dismiss the pill without reverting (timeout / next action). */
  onDismiss: () => void;
  /** Auto-dismiss delay in ms. */
  timeout?: number;
}

/** A transient pill announcing the last HP change with a single Undo. */
export function UndoPill({ label, onUndo, onDismiss, timeout = 4000 }: UndoPillProps) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  useEffect(() => {
    const t = setTimeout(() => onDismissRef.current(), timeout);
    return () => clearTimeout(t);
  }, [label, timeout]);

  return (
    <div className="undo-pill" role="status">
      <span className="undo-pill__label">{label}</span>
      <button type="button" className="undo-pill__btn" onClick={onUndo}>↶ Undo</button>
    </div>
  );
}
