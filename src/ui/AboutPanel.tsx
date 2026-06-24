import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "./controls";
import { shareHoard } from "./shareHoard";
import { WhatsNew } from "./WhatsNew";
import { CHANGELOG } from "./changelogData";
import { useDialogFocus } from "./useDialogFocus";
import "./AboutPanel.css";

/** The canonical source-repo URL (the project lives on GitHub). */
export const REPO_URL = "https://github.com/joshuafuller/hoard-hp-tracker";

export interface AboutPanelProps {
  /** Dismiss the panel (close button, backdrop, or Escape). */
  onClose: () => void;
  /** Replay the feature tour (#181) — closes About and starts the tour. Optional. */
  onTakeTour?: () => void;
}

const FEATURES = ["Offline-first", "Installable PWA", "Open source"];

/**
 * The "About" sheet reached from the radial hub (#74) — a small premium card, not a
 * plain modal: a gold emblem + wordmark hero over a soft bloom, feature badges, the
 * source-repo link (#52), and a footer. Layered for depth (backdrop blur, glow,
 * rimmed obsidian card) and springs in. The GitHub mark is an inline SVG so it works
 * fully offline. Dismisses on the close button, a backdrop tap, or Escape; focus
 * moves into the dialog on open.
 */
export function AboutPanel({ onClose, onTakeTour }: AboutPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocus(panelRef); // trap Tab within the panel + restore focus to the trigger on close (#262)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // Move focus INTO the dialog on open so keyboard/SR users aren't stranded
    // outside the modal (Copilot #152). Escape / close return control.
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const [showWhatsNew, setShowWhatsNew] = useState(false);

  // Share the app — native sheet where available, else copy the link and confirm.
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(copiedTimer.current), []); // clear on unmount
  async function onShare() {
    if (await shareHoard() === "copied") {
      setCopied(true);
      clearTimeout(copiedTimer.current); // reset on rapid re-clicks (Copilot #207)
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="about-backdrop" data-testid="about-backdrop" onClick={onClose}>
      <div
        className="about-panel"
        role="dialog"
        aria-modal="true"
        aria-label="About"
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
      >
        <IconButton variant="ghost" className="about-panel__close" aria-label="Close" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
            strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </IconButton>

        <div className="about-panel__hero">
          <span className="about-panel__bloom" aria-hidden="true" />
          <svg className="about-panel__emblem" viewBox="0 0 48 48" width="58" height="58" aria-hidden="true">
            <defs>
              <linearGradient id="about-emblem-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f6e4a8" />
                <stop offset="0.5" stopColor="#d9b85c" />
                <stop offset="1" stopColor="#9c7c2f" />
              </linearGradient>
            </defs>
            {/* A faceted gold coin/gem — the Molten Hoard motif. */}
            <circle cx="24" cy="24" r="20" fill="url(#about-emblem-grad)" stroke="#7a5e22" strokeWidth="1.5" />
            <path d="M24 9 38 24 24 39 10 24z" fill="none" stroke="#7a5e22" strokeWidth="1.4" opacity="0.65" />
            <path d="M24 9v30M10 24h28" stroke="#7a5e22" strokeWidth="1" opacity="0.45" />
            <path d="M15 16c4-3 14-3 18 0" fill="none" stroke="#fff6da" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          </svg>
          <h2 className="about-panel__title">Hoard</h2>
          <p className="about-panel__tagline">An offline, at-the-table HP, coins &amp; dice companion.</p>
        </div>

        <ul className="about-panel__features">
          {FEATURES.map((f) => (
            <li key={f} className="about-panel__feature">{f}</li>
          ))}
        </ul>

        <button type="button" className="about-panel__share" aria-label="Share Hoard" onClick={onShare}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
          </svg>
          <span aria-live="polite">{copied ? "Link copied" : "Share Hoard"}</span>
        </button>

        {onTakeTour && (
          <button type="button" className="about-panel__share about-panel__tour" onClick={onTakeTour}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2a8 8 0 00-8 8c0 5 8 12 8 12s8-7 8-12a8 8 0 00-8-8z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            <span>Take the tour</span>
          </button>
        )}

        <a
          className="about-panel__link"
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View source on GitHub"
        >
          <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 012-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          View source on GitHub
        </a>

        <button
          type="button"
          className="about-panel__version about-panel__whatsnew"
          onClick={() => setShowWhatsNew(true)}
          aria-haspopup="dialog"
        >
          v{__APP_VERSION__} · What&rsquo;s new
        </button>
        <p className="about-panel__build" data-testid="about-build">{__BUILD__}</p>
        <p className="about-panel__footer">AGPL-3.0 · ships no game content · built for the table</p>
      </div>
      {/* Portal to body so the What's-new backdrop isn't nested in the About backdrop
          (whose click closes About) — otherwise its clicks would bubble + double-close. */}
      {showWhatsNew &&
        createPortal(
          <WhatsNew entries={CHANGELOG} onClose={() => setShowWhatsNew(false)} />,
          document.body,
        )}
    </div>
  );
}
