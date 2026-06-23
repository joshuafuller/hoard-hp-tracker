import { type ReactNode, useEffect, useRef, useState } from "react";
import type { HpState } from "../domain/hp";
import { tierFor } from "./HpBar";
import { glowCss, hpColor, rgbCss } from "./hpColor";
import { heartbeatBpm } from "./liquid/heartbeat";
import { stopHeartbeat, updateHeartbeat } from "../sound/heartbeatAudio";
import { LiquidRenderer } from "./liquid/renderer";
import { useGyro } from "./liquid/useGyro";
import { useLiquidEngine } from "./liquid/useLiquidEngine";
import { type DragApply, dragAmount, isTap } from "./liquid/dragInput";
import { useOrbDragHint } from "./orbDragHint";

/** Liquid Obsidian centerpiece: HP as a real fluid (PBF sim) in a glass orb. */

// The surface tint ships a darker "deep" tone so the fluid shades from surface
// to depth. The surface colour itself is a continuous function of HP (hpColor).
const darken = (c: [number, number, number], f = 0.42): [number, number, number] => [c[0] * f, c[1] * f, c[2] * f];
// --hp-temp #5b8fd9 (Molten Hoard sapphire ward) as 0..1 rgb — keep in sync with the CSS token.
const TEMP_RGB: [number, number, number] = [0.357, 0.561, 0.851];

export interface LiquidVesselProps extends HpState {
  onEditCurrent?: () => void;
  onEditMax?: () => void;
  onEditTemp?: () => void;
  /** Orb-drag-down: apply this much damage. */
  onDamage?: (amount: number) => void;
  /** Orb-drag-up: apply this much healing. */
  onHeal?: (amount: number) => void;
}

export function LiquidVessel({ current, max, temp, onEditCurrent, onEditMax, onEditTemp, onDamage, onHeal }: LiquidVesselProps) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const tier = tierFor(current, max);
  const flash = useChangeFlash(current + temp);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const orbRef = useRef<HTMLDivElement | null>(null);
  const foilRef = useRef<HTMLDivElement | null>(null);
  const { gravity } = useGyro();

  // Use the WebGL fluid only where it can actually run: WebGL2 present, motion
  // allowed, and the GL context built successfully (onUnsupported flips it off).
  const [webglOk, setWebglOk] = useState(() => LiquidRenderer.isSupported());
  const reducedMotion = useReducedMotion();
  const active = webglOk && !reducedMotion;

  // Brushed-gold foil sweep tied to the device gyro: the specular highlight
  // tracks the phone's left-right tilt (gravity.x), like light raking across a
  // foil card. No sensor (desktop) → gravity.x stays 0 → the highlight rests
  // centered (no fake timed shimmer). Disabled under reduced motion.
  useFoilTilt(foilRef, gravity, reducedMotion);

  const color = hpColor(current, max);
  // Drive the CSS accent (numerals, aura, glow) from the same continuous colour
  // so the whole orb fades together instead of snapping at the tier thresholds.
  // Heartbeat pulse (#220): in the danger zone the orb throbs, quickening as HP nears 0;
  // none when healthy/down, and disabled under reduced motion.
  const bpm = heartbeatBpm(current, max);
  const heartbeat = bpm !== null && !reducedMotion;
  const accentStyle = {
    "--accent": rgbCss(color),
    "--accent-glow": glowCss(color),
    ...(heartbeat ? { "--heartbeat-period": `${(60 / bpm).toFixed(3)}s` } : {}),
  } as React.CSSProperties;
  // Audible heartbeat (#243): drive the looping bass lub-dub from the same bpm as the
  // visual so they quicken together — but independent of reduced-motion (sound is the
  // motion-free alternative). Mute is handled per-beat inside the scheduler.
  useEffect(() => {
    if (bpm === null) stopHeartbeat();
    else updateHeartbeat(bpm);
  }, [bpm]);
  useEffect(() => () => stopHeartbeat(), []); // silence on unmount
  const tempRatio = max > 0 ? Math.max(0, Math.min(1, temp / max)) : 0;
  useLiquidEngine({
    canvasRef,
    ratio,
    tempRatio,
    color,
    deep: darken(color),
    tempColor: TEMP_RGB,
    gravity,
    active,
    onUnsupported: () => setWebglOk(false),
  });

  // Orb-as-input: a vertical drag applies damage (down) / heal (up), scaled to
  // the orb height. A real drag suppresses the trailing click so it can't also
  // open the keypad; taps fall through to the value buttons (current/max/temp).
  const [drag, setDrag] = useState<DragApply | null>(null);
  const dragRef = useRef<{ startY: number; orbPx: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  // First-run affordance: telegraph that the orb is draggable until the user drags
  // once, then it recedes for good (#94).
  const { seen: dragHintSeen, markSeen: markDragSeen } = useOrbDragHint();

  function onOrbPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button > 0) return;
    // The drag can start on the orb OR on the centered readout overlay (the
    // numerals are the most natural grab target). Either way, scale to the ORB's
    // height — fall back to the event target if the orb ref isn't measured yet.
    const orb = orbRef.current ?? e.currentTarget;
    const orbPx = orb.clientHeight || orb.getBoundingClientRect().height;
    dragRef.current = { startY: e.clientY, orbPx, moved: false };
    // NB: pointer capture is deferred to the first real move (below). Capturing on
    // a *tap* of a numeral retargets the synthesized click to the capture element,
    // so the value buttons would never open their editor. Taps must not capture.
  }
  function onOrbPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const st = dragRef.current;
    if (!st) return;
    const dy = e.clientY - st.startY;
    if (!st.moved && isTap(dy)) return;
    if (!st.moved) {
      // First frame that counts as a real drag — now capture so tracking
      // continues even if the pointer leaves the element.
      st.moved = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    setDrag(dragAmount(dy, st.orbPx, max));
  }
  function onOrbPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const st = dragRef.current;
    if (!st) return;
    dragRef.current = null;
    setDrag(null);
    const dy = e.clientY - st.startY;
    if (st.moved && !isTap(dy)) {
      const { kind, amount } = dragAmount(dy, st.orbPx, max);
      if (amount > 0) {
        if (kind === "damage") onDamage?.(amount);
        else onHeal?.(amount);
        suppressClick.current = true;
        markDragSeen(); // a real drag committed — the affordance is discovered
      }
    }
  }
  // pointercancel (browser/OS yanked the gesture — scroll takeover, app switch,
  // palm rejection) must NOT compute or commit an amount. Just drop the drag.
  function onOrbPointerCancel() {
    dragRef.current = null;
    setDrag(null);
  }
  function onOrbClickCapture(e: React.MouseEvent<HTMLDivElement>) {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.stopPropagation();
      e.preventDefault();
    }
  }

  return (
    <div className="vessel" data-tier={tier} data-flash={flash ?? undefined} data-dragging={drag ? "" : undefined} data-heartbeat={heartbeat ? "" : undefined} style={accentStyle}>
      <div className="vessel__aura" aria-hidden="true" />
      <div
        className="vessel__orb"
        data-testid="hp-bar"
        data-tier={tier}
        data-dragging={drag ? "" : undefined}
        ref={orbRef}
        onPointerDown={onOrbPointerDown}
        onPointerMove={onOrbPointerMove}
        onPointerUp={onOrbPointerUp}
        onPointerCancel={onOrbPointerCancel}
        onClickCapture={onOrbClickCapture}
      >
        {active ? (
          <canvas ref={canvasRef} className="vessel__canvas" aria-hidden="true" />
        ) : (
          <div className="vessel__fallback" aria-hidden="true">
            <div className="vessel__fallback-fill" style={{ height: `${ratio * 100}%` }} />
            {/* temp HP as a sapphire ward band that rides ON the HP surface, like
                the WebGL temp layer. Absolutely positioned (not stacked in flow)
                and its bottom anchor is clamped so a full-HP character still sees
                the band at the brim instead of it clipping out the top — #110,
                Codex P2 on #119. */}
            {tempRatio > 0 &&
              (() => {
                const tempH = Math.min(1, tempRatio);
                const tempBottom = Math.min(ratio, 1 - tempH); // never push the top past the brim
                return (
                  <div
                    className="vessel__fallback-temp"
                    style={{ bottom: `${tempBottom * 100}%`, height: `${tempH * 100}%` }}
                  />
                );
              })()}
          </div>
        )}
        <div className="vessel__foil" aria-hidden="true" ref={foilRef} />
        <div className="vessel__rim" aria-hidden="true" />
        <div className="vessel__shine" aria-hidden="true" />
        {/* Heartbeat (#220/#239): a colour flush ON the orb fill that throbs lub-dub,
            quickening as HP nears 0. Inside the orb (clipped to the circle), over the
            fill but under the readout numerals (a later sibling). */}
        {heartbeat && <div className="vessel__heartbeat" aria-hidden="true" />}
        {/* First-run drag affordance: faint up (heal) / down (damage) chevrons that
            recede once the user drags. Decorative + inert so it never blocks the drag
            or the tap-to-keypad path; honours reduced motion (static, no pulse). */}
        {!dragHintSeen && !drag && current > 0 && (
          <div className="vessel__drag-hint" aria-hidden="true">
            <svg className="vessel__drag-chevron" data-dir="up" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 14 12 8 18 14" />
            </svg>
            <svg className="vessel__drag-chevron" data-dir="down" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 10 12 16 18 10" />
            </svg>
          </div>
        )}
      </div>

      <div
        className="vessel__readout"
        onPointerDown={onOrbPointerDown}
        onPointerMove={onOrbPointerMove}
        onPointerUp={onOrbPointerUp}
        onPointerCancel={onOrbPointerCancel}
        onClickCapture={onOrbClickCapture}
      >
        <output
          role="status"
          className="vessel__nums"
          aria-label={`${current} of ${max} hit points${temp > 0 ? `, ${temp} temporary` : ""}`}
        >
          <EditableValue className="vessel__current" testid="hp-current" label="Edit current HP" onEdit={onEditCurrent}>
            {current}
          </EditableValue>
          <EditableValue className="vessel__max" testid="hp-max" label="Edit maximum HP" onEdit={onEditMax}>
            / {max}
          </EditableValue>
        </output>
        {onEditTemp ? (
          <button
            type="button"
            className="vessel__temp-badge"
            data-testid="hp-temp-badge"
            data-empty={temp === 0 || undefined}
            aria-label="Edit temporary HP"
            onClick={onEditTemp}
          >
            +{temp}
          </button>
        ) : (
          temp > 0 && (
            <span className="vessel__temp-badge" data-testid="hp-temp-badge" aria-hidden="true">
              +{temp}
            </span>
          )
        )}
      </div>

      {/* Live drag delta — a floating chip ABOVE the readout (last sibling, outside
          the orb's isolation context so it can't be trapped behind the numerals;
          the earlier #94 fix over-corrected and hid it). Its own backdrop surface
          separates it from the totals, like the dice-result card. */}
      {drag && drag.amount > 0 && (
        <div className="vessel__drag" data-kind={drag.kind} aria-hidden="true">
          {drag.kind === "damage" ? "−" : "+"}
          {drag.amount}
        </div>
      )}
    </div>
  );
}

/**
 * Drive the foil specular sweep from the device gyro. Each frame, read the live
 * left-right tilt (gravity.x ∈ [-1,1]) and write it (smoothed) to the foil
 * element's `--foil-shift` CSS var, which positions the highlight. Genuine
 * sensor input — not a timed loop. Rests centered when there's no sensor.
 */
function useFoilTilt(
  ref: React.RefObject<HTMLDivElement | null>,
  gravity: React.MutableRefObject<{ x: number; y: number }>,
  reducedMotion: boolean,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // No reason to spin a per-frame loop when there's no input to read: under
    // reduced motion, with no rAF, or on a device with no orientation sensor
    // (desktop, #100) gravity.x never moves — rest the highlight centered once.
    const hasSensor = typeof window !== "undefined" && "DeviceOrientationEvent" in window;
    if (reducedMotion || typeof requestAnimationFrame !== "function" || !hasSensor) {
      el.style.setProperty("--foil-shift", "0%");
      return;
    }
    let raf = 0;
    let cur = 0;
    const tick = () => {
      const target = Math.max(-1, Math.min(1, gravity.current.x));
      cur += (target - cur) * 0.14; // smooth out sensor jitter
      // ±28% moves the specular hotspot across the globe as the phone tilts.
      el.style.setProperty("--foil-shift", `${(cur * 28).toFixed(2)}%`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ref, gravity, reducedMotion]);
}

/** Live `prefers-reduced-motion` — reacts if the user toggles it while mounted. */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true,
  );
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    // older Safari/iOS only expose the legacy addListener/removeListener
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);
  return reduced;
}

function EditableValue({
  className,
  testid,
  label,
  onEdit,
  children,
}: {
  className: string;
  testid: string;
  label: string;
  onEdit?: () => void;
  children: ReactNode;
}) {
  if (onEdit) {
    return (
      <button type="button" className={`${className} vessel__edit`} data-testid={testid} aria-label={label} onClick={onEdit}>
        {children}
      </button>
    );
  }
  return (
    <span className={className} data-testid={testid}>
      {children}
    </span>
  );
}

type Flash = "damage" | "heal";
function useChangeFlash(value: number, holdMs = 700): Flash | undefined {
  const previous = useRef(value);
  const [flash, setFlash] = useState<Flash | undefined>(undefined);
  useEffect(() => {
    if (value === previous.current) return;
    setFlash(value < previous.current ? "damage" : "heal");
    previous.current = value;
    const t = setTimeout(() => setFlash(undefined), holdMs);
    return () => clearTimeout(t);
  }, [value, holdMs]);
  return flash;
}
