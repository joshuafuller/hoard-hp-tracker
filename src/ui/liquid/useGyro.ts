import { useEffect, useRef } from "react";

/** A live gravity direction in screen space (x right, y down). */
export interface Gravity {
  x: number;
  y: number;
}

interface DeviceOrientationEventStatic {
  requestPermission?: () => Promise<"granted" | "denied">;
}

/** Gentle downward pull kept when the screen is flat, so the pool still rests
 * at the bottom instead of floating — without amplifying sensor noise. */
const FLAT_FLOOR = 0.15;

/**
 * Map device-orientation Euler angles (degrees) to a screen-space gravity vector
 * (x right, y DOWN). This is the projection of world "down" onto the screen
 * plane:
 *
 *   x = cos(beta)·sin(gamma)   y = sin(beta) + FLAT_FLOOR
 *
 * Unlike a bare `sin`, this keeps the correct sign through every orientation:
 * tilting past vertical (the screen turning to face the floor) keeps pulling
 * down instead of reversing, and a roll inverts correctly once face-down.
 *
 * The result is intentionally NOT normalized — its magnitude shrinks toward 0 as
 * the screen approaches horizontal, so the sim applies gentle (not amplified)
 * gravity when the phone lies flat. A small downward floor keeps a flat screen
 * settling calmly at the bottom.
 */
export function projectGravity(betaDeg: number, gammaDeg: number): Gravity {
  const beta = (betaDeg * Math.PI) / 180; // front-back pitch
  const gamma = (gammaDeg * Math.PI) / 180; // left-right roll
  const x = Math.cos(beta) * Math.sin(gamma);
  const y = Math.sin(beta) + FLAT_FLOOR;
  return { x, y };
}

/**
 * Resolve a raw DeviceOrientation reading (either angle may be `null`) into a
 * screen-space gravity vector. The single source of truth the `onOrient`
 * handler delegates to.
 *
 * Substituting a fake `beta` into {@link projectGravity} is unsafe: its
 * `x = cos(beta)·sin(gamma)` projection drives the lateral (roll) component
 * through `cos(beta)`, so any pitch fallback near 90° silently zeroes roll. So
 * the partial cases are handled explicitly:
 *
 *  - **No usable angle** → rest straight "down" `{0, 1}` (the ref's default).
 *  - **Roll only (no pitch)** → assume the phone is upright and let the roll
 *    rotate world-down in the screen plane: `x = sin(gamma)`, `y = cos(gamma)`.
 *    Roll is preserved, the sign matches {@link projectGravity}'s upright case,
 *    and the pull never reverses across gamma's spec range [-90°, 90°].
 *  - **Both present** → the full {@link projectGravity} projection.
 */
export function gravityFromOrientation(beta: number | null, gamma: number | null): Gravity {
  if (beta == null) {
    if (gamma == null) return { x: 0, y: 1 };
    const g = (gamma * Math.PI) / 180;
    return { x: Math.sin(g), y: Math.cos(g) };
  }
  return projectGravity(beta, gamma ?? 0);
}

/**
 * Tracks device tilt and exposes it as a gravity direction the fluid sim can
 * follow, so water pools toward the low edge of the phone. Falls back to plain
 * "down" with no sensor (desktop) or when permission is denied.
 *
 * iOS requires `DeviceOrientationEvent.requestPermission()` from a user gesture,
 * so we attach a one-time pointer handler that requests it on the first tap.
 * Everywhere else we just listen. Returns a ref the render loop reads each frame.
 */
export function useGyro(): { gravity: React.MutableRefObject<Gravity> } {
  const gravity = useRef<Gravity>({ x: 0, y: 1 });

  useEffect(() => {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return;

    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta == null && e.gamma == null) return;
      // Resolve world-down onto the screen plane. The vector is left un-normalized
      // on purpose — its magnitude tells the sim how upright the phone is. Partial
      // events (notably gamma-only) keep their roll instead of collapsing to "down".
      gravity.current = gravityFromOrientation(e.beta, e.gamma);
    };

    let attached = false;
    let live = true; // false after unmount, so a late permission grant is ignored
    const attach = () => {
      if (attached || !live) return;
      attached = true;
      window.addEventListener("deviceorientation", onOrient, true);
    };

    const DOE = window.DeviceOrientationEvent as unknown as DeviceOrientationEventStatic;
    const needsPermission = typeof DOE?.requestPermission === "function";

    const onFirstTap = () => {
      if (needsPermission) {
        DOE.requestPermission?.()
          .then((res) => {
            if (res === "granted") attach();
          })
          .catch(() => {
            /* denied or unavailable — stay on the gravity fallback */
          });
      }
      window.removeEventListener("pointerdown", onFirstTap);
    };

    if (needsPermission) {
      window.addEventListener("pointerdown", onFirstTap, { once: true });
    } else {
      attach();
    }

    return () => {
      live = false;
      window.removeEventListener("deviceorientation", onOrient, true);
      window.removeEventListener("pointerdown", onFirstTap);
    };
  }, []);

  return { gravity };
}
