import { Button } from "./controls";

export interface ConcentrationPromptProps {
  /** The Constitution save DC for this check. */
  dc: number;
  /** Dismiss the prompt (player made the save / keeping concentration). */
  onDismiss: () => void;
  /** Drop concentration (player failed the save or chooses to end it). */
  onDrop: () => void;
}

/**
 * A transient banner shown when damage is taken while concentrating (#30).
 * Renders above the Undo pill (via a `bottom` offset class modifier) so the
 * two never overlap. One tap to keep (dismiss) or drop.
 */
export function ConcentrationPrompt({ dc, onDismiss, onDrop }: ConcentrationPromptProps) {
  return (
    <div className="concentration-prompt" role="status">
      <span className="concentration-prompt__label">
        Concentration — CON save DC {dc}
      </span>
      <Button variant="ghost" size="sm" onClick={onDismiss} aria-label="Keep concentration">
        Keep
      </Button>
      <Button variant="danger" size="sm" onClick={onDrop} aria-label="Drop concentration">
        Drop
      </Button>
    </div>
  );
}
