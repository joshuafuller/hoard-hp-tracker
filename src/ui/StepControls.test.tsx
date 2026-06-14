import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StepControls } from "./StepControls";

describe("StepControls callbacks", () => {
  it("fires onDamage(1) for the primary minus button", async () => {
    const onDamage = vi.fn();
    render(<StepControls onDamage={onDamage} onHeal={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /damage 1/i }));
    expect(onDamage).toHaveBeenCalledWith(1);
  });

  it("fires onHeal(1) for the primary plus button", async () => {
    const onHeal = vi.fn();
    render(<StepControls onDamage={() => {}} onHeal={onHeal} />);
    await userEvent.click(screen.getByRole("button", { name: /heal 1/i }));
    expect(onHeal).toHaveBeenCalledWith(1);
  });

  it("fires onDamage(5) for the secondary minus-five button", async () => {
    const onDamage = vi.fn();
    render(<StepControls onDamage={onDamage} onHeal={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /damage 5/i }));
    expect(onDamage).toHaveBeenCalledWith(5);
  });

  it("fires onHeal(5) for the secondary plus-five button", async () => {
    const onHeal = vi.fn();
    render(<StepControls onDamage={() => {}} onHeal={onHeal} />);
    await userEvent.click(screen.getByRole("button", { name: /heal 5/i }));
    expect(onHeal).toHaveBeenCalledWith(5);
  });

  it("gives every step button a tap target of at least 44px", () => {
    render(<StepControls onDamage={() => {}} onHeal={() => {}} />);
    for (const button of screen.getAllByRole("button")) {
      expect(Number.parseInt(button.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
      expect(Number.parseInt(button.style.minWidth, 10)).toBeGreaterThanOrEqual(44);
    }
  });
});
