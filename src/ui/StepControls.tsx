import { StepButton } from "./StepButton";

export interface StepControlsProps {
  /** Apply `n` damage (positive magnitude). */
  onDamage: (n: number) => void;
  /** Apply `n` healing (positive magnitude). */
  onHeal: (n: number) => void;
}

/**
 * The thumb-reachable control cluster: a primary −/+ pair that steps by 1 and a
 * secondary −5/+5 row for faster swings. Damage and heal are separate callbacks
 * carrying positive magnitudes, mirroring the pure domain's `damage`/`heal`.
 */
export function StepControls({ onDamage, onHeal }: StepControlsProps) {
  return (
    <div className="step-controls">
      <div className="step-controls__row step-controls__row--primary">
        <StepButton label="Damage 1" variant="primary" onPress={() => onDamage(1)}>
          −
        </StepButton>
        <StepButton label="Heal 1" variant="primary" onPress={() => onHeal(1)}>
          +
        </StepButton>
      </div>
      <div className="step-controls__row step-controls__row--secondary">
        <StepButton label="Damage 5" variant="secondary" onPress={() => onDamage(5)}>
          −5
        </StepButton>
        <StepButton label="Heal 5" variant="secondary" onPress={() => onHeal(5)}>
          +5
        </StepButton>
      </div>
    </div>
  );
}
