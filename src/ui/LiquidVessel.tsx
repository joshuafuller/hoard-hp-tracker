import { type ReactNode, useEffect, useRef, useState } from "react";
import type { HpState } from "../domain/hp";
import { tierFor } from "./HpBar";
import { glowCss, hpColor, rgbCss } from "./hpColor";
import { LiquidRenderer } from "./liquid/renderer";
import { useGyro } from "./liquid/useGyro";
import { useLiquidEngine } from "./liquid/useLiquidEngine";

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
}

export function LiquidVessel({ current, max, temp, onEditCurrent, onEditMax, onEditTemp }: LiquidVesselProps) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const tier = tierFor(current, max);
  const flash = useChangeFlash(current + temp);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { gravity } = useGyro();

  // Use the WebGL fluid only where it can actually run: WebGL2 present, motion
  // allowed, and the GL context built successfully (onUnsupported flips it off).
  const [webglOk, setWebglOk] = useState(() => LiquidRenderer.isSupported());
  const reducedMotion = useReducedMotion();
  const active = webglOk && !reducedMotion;

  const color = hpColor(current, max);
  // Drive the CSS accent (numerals, aura, glow) from the same continuous colour
  // so the whole orb fades together instead of snapping at the tier thresholds.
  const accentStyle = { "--accent": rgbCss(color), "--accent-glow": glowCss(color) } as React.CSSProperties;
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

  return (
    <div className="vessel" data-tier={tier} data-flash={flash ?? undefined} style={accentStyle}>
      <div className="vessel__aura" aria-hidden="true" />
      <div className="vessel__orb" data-testid="hp-bar" data-tier={tier}>
        {active ? (
          <canvas ref={canvasRef} className="vessel__canvas" aria-hidden="true" />
        ) : (
          <div className="vessel__fallback" aria-hidden="true">
            <div className="vessel__fallback-fill" style={{ height: `${ratio * 100}%` }} />
          </div>
        )}
        <div className="vessel__foil" aria-hidden="true" />
        <div className="vessel__rim" aria-hidden="true" />
        <div className="vessel__shine" aria-hidden="true" />
      </div>

      <div className="vessel__readout">
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
    </div>
  );
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
