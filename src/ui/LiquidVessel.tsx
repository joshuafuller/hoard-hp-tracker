import { type ReactNode, useEffect, useRef, useState } from "react";
import type { HpState } from "../domain/hp";
import { tierFor } from "./HpBar";

/** Liquid Obsidian centerpiece: HP as living liquid in a glass orb. */

const VB = 120; // SVG viewBox size (square)
const WAVE_LEN = 40; // wavelength in user units; drift translates by exactly this

/** A tileable sine surface filled downward — sampled so the drift loops seamlessly. */
function wavePath(amp: number, baseY: number): string {
  const pts: string[] = [];
  for (let x = -WAVE_LEN; x <= VB + WAVE_LEN; x += 3) {
    const y = (baseY + amp * Math.sin((2 * Math.PI * x) / WAVE_LEN)).toFixed(2);
    pts.push(`${x},${y}`);
  }
  return `M ${pts.join(" L ")} L ${VB + WAVE_LEN},${VB + 40} L ${-WAVE_LEN},${VB + 40} Z`;
}

const BACK = wavePath(5, 0);
const FRONT = wavePath(3.2, 2);

export interface LiquidVesselProps extends HpState {
  onEditCurrent?: () => void;
  onEditMax?: () => void;
  onEditTemp?: () => void;
}

export function LiquidVessel({
  current,
  max,
  temp,
  onEditCurrent,
  onEditMax,
  onEditTemp,
}: LiquidVesselProps) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const tier = tierFor(current, max);
  const flash = useChangeFlash(current + temp);
  const levelY = (1 - ratio) * VB; // 0 = full, VB = empty
  const tempH = max > 0 ? Math.min(1, temp / max) * VB : 0;

  return (
    <div className="vessel" data-tier={tier} data-flash={flash ?? undefined}>
      <div className="vessel__aura" aria-hidden="true" />
      <svg
        className="vessel__svg"
        viewBox={`0 0 ${VB} ${VB}`}
        aria-hidden="true"
        data-testid="hp-bar"
        data-tier={tier}
      >
        <defs>
          <clipPath id="vesselClip">
            <circle cx={VB / 2} cy={VB / 2} r={VB / 2 - 3} />
          </clipPath>
        </defs>

        <g clipPath="url(#vesselClip)">
          <rect className="vessel__well" x="0" y="0" width={VB} height={VB} />

          {/* The liquid body — its top rides at `levelY`, spring-settling on change. */}
          <g className="vessel__liquid" style={{ transform: `translateY(${levelY}px)` }}>
            <g className="vessel__wave vessel__wave--back">
              <path d={BACK} />
            </g>
            <g className="vessel__wave vessel__wave--front">
              <path d={FRONT} data-testid="hp-bar-fill" />
            </g>
          </g>

          {/* Temp HP — a luminous overshield band riding on the liquid surface. */}
          {temp > 0 && (
            <g
              className="vessel__temp"
              style={{ transform: `translateY(${levelY}px)` }}
              data-testid="hp-overshield"
            >
              <rect x="0" y={-tempH} width={VB} height={tempH} />
            </g>
          )}
        </g>

        <circle className="vessel__rim" cx={VB / 2} cy={VB / 2} r={VB / 2 - 3} />
        <ellipse className="vessel__shine" cx={VB * 0.37} cy={VB * 0.28} rx={VB * 0.2} ry={VB * 0.1} />
      </svg>

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
