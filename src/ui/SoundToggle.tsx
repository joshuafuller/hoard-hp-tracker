import { useSoundEnabled } from "../sound/soundSettings";

/**
 * A small, Obsidian-styled toggle for the optional sound effects (#56). It uses
 * a stable accessible name ("Sound effects") with `aria-pressed` reflecting the
 * on/off state, so assistive tech announces a clear pressed/not-pressed state,
 * and swaps between a speaker and a muted-speaker glyph. State lives in
 * `useSoundEnabled`, which persists the preference for the sound engine to read.
 */
export function SoundToggle() {
  const [enabled, toggle] = useSoundEnabled();

  return (
    <button
      type="button"
      className="sound-toggle"
      data-enabled={enabled}
      aria-label="Sound effects"
      aria-pressed={enabled}
      onClick={toggle}
    >
      <svg
        className="sound-toggle__icon"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden="true"
        focusable="false"
      >
        {/* Speaker body, shared by both states. */}
        <path
          d="M4 9v6h4l5 4V5L8 9H4z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {enabled ? (
          // Sound waves.
          <>
            <path
              d="M16 8.5a5 5 0 0 1 0 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M18.5 6a8.5 8.5 0 0 1 0 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </>
        ) : (
          // A slash across the speaker for the muted state.
          <line
            x1="16"
            y1="8"
            x2="22"
            y2="16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        )}
      </svg>
    </button>
  );
}
