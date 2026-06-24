import { useEffect, useRef, useState } from "react";
import { IconButton } from "./controls";
import type { ChangelogEntry } from "./changelog";
import "./WhatsNew.css";

interface WhatsNewProps {
  /** Parsed changelog entries (newest first). */
  entries: ChangelogEntry[];
  onClose: () => void;
}

/** How many recent versions to show before the "Show older" affordance (#266). */
const RECENT = 3;

/** Capitalise the first letter (the scope prefix is now a separate tag, so the prose
 *  used to start lower-case, e.g. "pluggable…" → "Pluggable…"). */
function sentence(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/** Classify a section heading so its dot can be colour-coded (#266). */
function sectionKind(title: string): "added" | "fixed" | "changed" {
  const t = title.toLowerCase();
  if (t.includes("add") || t.includes("feat")) return "added";
  if (t.includes("fix")) return "fixed";
  return "changed";
}

/**
 * "What's new" (#209, polished #266): an offline, read-only changelog reached from the
 * About version line. Player-facing — the commit scope becomes a subtle category tag,
 * issue refs are dropped, sections get colour-coded dots, and only the most recent
 * versions show until "Show older". Dialog semantics + Escape/backdrop close + focus on
 * open; reduced-motion via CSS. Renders the bundled, parsed CHANGELOG — never fetches.
 */
export function WhatsNew({ entries, onClose }: WhatsNewProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? entries : entries.slice(0, RECENT);
  const olderCount = entries.length - visible.length;

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLButtonElement>(".whatsnew__close")?.focus();
    const onKey = (e: KeyboardEvent) => {
      // Stop Escape before About's window-level handler — a React portal still bubbles
      // through the React tree, so this would otherwise close About too (Codex #256).
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="whatsnew-backdrop"
      data-testid="whatsnew-backdrop"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
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
          {visible.map((entry) => (
            <section className="whatsnew__release" key={entry.version}>
              <h3 className="whatsnew__version">
                <span className="whatsnew__v">v{entry.version}</span>
                {entry.date && <span className="whatsnew__date">{entry.date}</span>}
              </h3>
              {entry.sections.map((section) => (
                <div className="whatsnew__section" key={section.title}>
                  <h4 className="whatsnew__section-title" data-kind={sectionKind(section.title)}>
                    <span className="whatsnew__sdot" aria-hidden="true" />
                    {section.title}
                  </h4>
                  <ul className="whatsnew__items">
                    {section.items.map((item, i) => (
                      <li className="whatsnew__item" key={i}>
                        {item.scope && <span className="whatsnew__tag">{item.scope}</span>}
                        <span className="whatsnew__text">{sentence(item.text)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
          {olderCount > 0 && (
            <button
              type="button"
              className="whatsnew__more"
              onClick={() => {
                // The button unmounts (olderCount → 0); move focus to a stable control
                // FIRST so keyboard focus isn't dropped to <body> (Copilot a11y).
                dialogRef.current?.querySelector<HTMLButtonElement>(".whatsnew__close")?.focus();
                setShowAll(true);
              }}
            >
              Show {olderCount} older version{olderCount > 1 ? "s" : ""}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
