import { useEffect, useState } from "react";
import { updateNotice } from "./updateNotice";
import "./UpdateToast.css";

const VERSION_KEY = "hoard:version";

/**
 * After a silent `autoUpdate` swaps the service worker, a brief "Updated to vX"
 * status toast — no reload prompt (the new version is already running). Shows once
 * per actual version change (#167); silent on first install and plain reloads.
 * Auto-dismisses after a few seconds; dismissible; respects reduced motion (CSS).
 */
export function UpdateToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(VERSION_KEY);
      localStorage.setItem(VERSION_KEY, __APP_VERSION__); // record current so the next load is silent
    } catch {
      return; // storage unavailable — never block the app over a cosmetic toast
    }
    const notice = updateNotice(stored, __APP_VERSION__);
    if (!notice) return;
    setMessage(notice);
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!message) return null;
  return (
    <div className="update-toast" role="status" aria-live="polite">
      <span className="update-toast__text">{message}</span>
      <button type="button" className="update-toast__dismiss" aria-label="Dismiss" onClick={() => setMessage(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
