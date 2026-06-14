import { useEffect, useRef } from "react";

/** A live gravity direction in screen space (x right, y down). */
export interface Gravity {
  x: number;
  y: number;
}

interface DeviceOrientationEventStatic {
  requestPermission?: () => Promise<"granted" | "denied">;
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
      const beta = ((e.beta ?? 90) * Math.PI) / 180; // front-back pitch
      const gamma = ((e.gamma ?? 0) * Math.PI) / 180; // left-right roll
      // project world-down onto the screen plane
      const gx = Math.sin(gamma);
      const gy = Math.sin(beta);
      // keep a gentle downward bias so a flat phone still has a clear bottom
      const by = gy + 0.15;
      const len = Math.hypot(gx, by) || 1;
      gravity.current = { x: gx / len, y: by / len };
    };

    let attached = false;
    const attach = () => {
      if (attached) return;
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
      window.removeEventListener("deviceorientation", onOrient, true);
      window.removeEventListener("pointerdown", onFirstTap);
    };
  }, []);

  return { gravity };
}
