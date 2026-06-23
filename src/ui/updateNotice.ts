/**
 * The PWA stays on `autoUpdate` (the service worker swaps silently). To still tell
 * the user they're now current without a reload prompt, we compare the build-injected
 * `__APP_VERSION__` against the last version this device saw (persisted in
 * localStorage): a *different* stored version means an auto-update applied since the
 * last visit, so we announce it. No stored version is a first install, and an equal
 * one is a plain reload — both silent. (#167; version from #166.)
 */
export function updateNotice(stored: string | null, current: string): string | null {
  if (!stored || stored === current) return null;
  return `Updated to v${current}`;
}
