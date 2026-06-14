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
      // Project world-down onto the screen plane. The vector is left un-normalized
      // on purpose — its magnitude tells the sim how upright the phone is.
      gravity.current = projectGravity(e.beta ?? 90, e.gamma ?? 0);
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
