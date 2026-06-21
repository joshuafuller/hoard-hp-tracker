/**
 * A compact "how long ago" label for the roll log (pure; `now` is injectable so
 * it's deterministic in tests). Future/now → "just now".
 */
export function relativeTime(atMs: number, nowMs: number): string {
  const delta = nowMs - atMs;
  if (delta < 45_000) return "just now";
  if (delta < 3_600_000) return `${Math.max(1, Math.floor(delta / 60_000))}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return `${Math.floor(delta / 86_400_000)}d ago`;
}
