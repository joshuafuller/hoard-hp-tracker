import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StepButton } from "./StepButton";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StepButton", () => {
  it("fires onPress when activated", async () => {
    const onPress = vi.fn();
    render(<StepButton label="Heal 1" onPress={onPress} />);
    await userEvent.click(screen.getByRole("button", { name: "Heal 1" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("exposes its label as the accessible name", () => {
    render(<StepButton label="Damage 5" onPress={() => {}} />);
    expect(screen.getByRole("button", { name: "Damage 5" })).toBeInTheDocument();
  });

  it("triggers haptic feedback when navigator.vibrate is available", async () => {
    const vibrate = vi.fn();
    vi.stubGlobal("navigator", { ...navigator, vibrate });
    render(<StepButton label="Heal 1" onPress={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Heal 1" }));
    expect(vibrate).toHaveBeenCalled();
  });

  it("does not throw when navigator.vibrate is unavailable", async () => {
    const onPress = vi.fn();
    render(<StepButton label="Heal 1" onPress={onPress} />);
    await userEvent.click(screen.getByRole("button", { name: "Heal 1" }));
    expect(onPress).toHaveBeenCalled();
  });
});
