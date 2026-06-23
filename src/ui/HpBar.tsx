import type { HpState } from "../domain/hp";
import { BLOODIED_AT, CRITICAL_AT } from "./hpColor";

/** Health tiers, keyed by the `current/max` ratio. CSS colours each tier. */
export type HpTier = "healthy" | "bloodied" | "critical" | "down";

// Tier thresholds (BLOODIED_AT 0.5 / CRITICAL_AT 0.25) live in hpColor.ts and are
// shared here so the colour ramp and the tier classification never drift (#164).

/** Map a `current/max` ratio to its colour tier. */
export function tierFor(current: number, max: number): HpTier {
  if (current <= 0) return "down";
  const ratio = current / max;
  if (ratio <= CRITICAL_AT) return "critical";
  if (ratio <= BLOODIED_AT) return "bloodied";
  return "healthy";
}

const pct = (n: number) => `${Math.max(0, Math.min(100, n * 100))}%`;

/**
 * The HP bar: a coloured fill sized to `current/max`, tinted green→amber→red by
 * tier, plus a visually distinct temporary-HP "overshield" segment laid over
 * the track. The overshield width is clamped so a large `temp` never overflows.
 */
export function HpBar({ current, max, temp }: HpState) {
  const tier = tierFor(current, max);

  return (
    <div
      className="hp-bar"
      data-testid="hp-bar"
      data-tier={tier}
      role="presentation"
    >
      <div
        className="hp-bar__fill"
        data-testid="hp-bar-fill"
        style={{ width: pct(current / max) }}
      />
      {temp > 0 && (
        <div
          className="hp-bar__overshield"
          data-testid="hp-overshield"
          style={{ width: pct(temp / max) }}
        />
      )}
    </div>
  );
}
