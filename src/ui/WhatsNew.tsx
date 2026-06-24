import { useEffect, useRef } from "react";
import { IconButton } from "./controls";
import type { ChangelogEntry } from "./changelog";
import "./WhatsNew.css";

interface WhatsNewProps {
  /** Parsed changelog entries (newest first). */
  entries: ChangelogEntry[];
  onClose: () => void;
}

/** Render a bullet's text with `**scope:**` spans bolded (the only markdown we emit). */
function renderText(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/**
 * "What's new" (#209): an offline, read-only changelog view reached from the About
 * version line. Renders the bundled, parsed CHANGELOG — never fetches. Dialog
 * semantics + Escape/backdrop close + focus on open; reduced-motion via CSS.
 */
export function WhatsNew({ entries, onClose }: WhatsNewProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Move focus into the dialog (the close button) on open, for keyboard + SR users.
    dialogRef.current?.querySelector<HTMLButtonElement>(".whatsnew__close")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="whatsnew-backdrop" data-testid="whatsnew-backdrop" onClick={onClose}>
      <div
        className="whatsnew"
        role="dialog"
        aria-modal="true"
        aria-label="What's new"
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* z-index in CSS keeps this above the scroll content — the #249 lesson. */}
        <IconButton variant="ghost" className="whatsnew__close" aria-label="Close" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </IconButton>
        <h2 className="whatsnew__title">What&rsquo;s new</h2>
        <div className="whatsnew__scroll">
          {entries.length === 0 && <p className="whatsnew__empty">No release notes yet.</p>}
          {entries.map((entry) => (
            <section className="whatsnew__release" key={entry.version}>
              <h3 className="whatsnew__version">
                v{entry.version}
                {entry.date && <span className="whatsnew__date">{entry.date}</span>}
              </h3>
              {entry.sections.map((section) => (
                <div className="whatsnew__section" key={section.title}>
                  <h4 className="whatsnew__section-title">{section.title}</h4>
                  <ul className="whatsnew__items">
                    {section.items.map((item, i) => (
                      <li className="whatsnew__item" key={i}>
                        {renderText(item.text)}
                        {item.refs.length > 0 && <span className="whatsnew__refs"> ({item.refs.join(", ")})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
