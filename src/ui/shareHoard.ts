/** The production app URL — shared even from a local/dev build so testers pass on
 *  the real thing (#183). */
export const SHARE_URL = "https://joshuafuller.github.io/hoard-hp-tracker/";

const SHARE_DATA = {
  title: "Hoard",
  text: "Hoard — an offline, at-the-table HP, coins & dice companion.",
  url: SHARE_URL,
};

/**
 * Share the app: native share sheet (Web Share API) where available — best on
 * mobile — else copy the link to the clipboard. Returns what happened so the UI can
 * confirm a copy. Feature-detects gracefully and never throws (a user cancelling the
 * native sheet is not a failure). (#183)
 */
export async function shareHoard(): Promise<"shared" | "copied" | "unavailable"> {
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  if (nav?.share) {
    try {
      await nav.share(SHARE_DATA);
      return "shared";
    } catch (e) {
      // The user dismissing the sheet is an AbortError — not a failure, and we must
      // NOT then silently copy. Browsers reject with a DOMException (not always an
      // `Error` instance), so match on `.name` alone (Copilot #207). Any other error
      // falls through to the copy fallback.
      if ((e as { name?: string } | null)?.name === "AbortError") return "shared";
    }
  }
  if (nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(SHARE_URL);
      return "copied";
    } catch {
      return "unavailable";
    }
  }
  return "unavailable";
}
