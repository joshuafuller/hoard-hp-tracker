import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DiceControls } from "./DiceControls";

const setup = (over: Partial<React.ComponentProps<typeof DiceControls>> = {}) => {
  const props = {
    sides: 20,
    modifier: 5,
    mode: "normal" as const,
    rolling: false,
    onSelectDie: vi.fn(),
    onSetMode: vi.fn(),
    onStepModifier: vi.fn(),
    onRoll: vi.fn(),
    onOpenNotation: vi.fn(),
    ...over,
  };
  render(<DiceControls {...props} />);
  return props;
};

describe("DiceControls", () => {
  it("renders a chip for every die size and marks the selected one pressed", () => {
    setup({ sides: 8 });
    for (const s of [4, 6, 8, 10, 12, 20, 100]) {
      expect(screen.getByRole("button", { name: `d${s}` })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "d8" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "d20" })).toHaveAttribute("aria-pressed", "false");
  });

  it("selects a die when its chip is clicked", async () => {
    const { onSelectDie } = setup();
    await userEvent.click(screen.getByRole("button", { name: "d6" }));
    expect(onSelectDie).toHaveBeenCalledWith(6);
  });

  it("offers co-equal disadvantage / normal / advantage, reflecting the active mode", async () => {
    const { onSetMode } = setup({ mode: "advantage" });
    const adv = screen.getByRole("button", { name: /^advantage/i });
    const dis = screen.getByRole("button", { name: /^disadvantage/i });
    const nrm = screen.getByRole("button", { name: /^normal/i });
    expect(adv).toHaveAttribute("aria-pressed", "true");
    expect(dis).toHaveAttribute("aria-pressed", "false");
    expect(nrm).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(dis);
    expect(onSetMode).toHaveBeenCalledWith("disadvantage");
  });

  it("shows the signed modifier and steps it", async () => {
    const { onStepModifier } = setup({ modifier: 5 });
    expect(screen.getByText("+5")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /increase modifier/i }));
    expect(onStepModifier).toHaveBeenCalledWith(1);
    await userEvent.click(screen.getByRole("button", { name: /decrease modifier/i }));
    expect(onStepModifier).toHaveBeenCalledWith(-1);
  });

  it("throws on the Throw button and opens the notation field", async () => {
    const { onRoll, onOpenNotation } = setup();
    await userEvent.click(screen.getByRole("button", { name: /throw/i }));
    expect(onRoll).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /notation/i }));
    expect(onOpenNotation).toHaveBeenCalled();
  });

  it("disables Throw while a roll is in flight", () => {
    setup({ rolling: true });
    expect(screen.getByRole("button", { name: /throw/i })).toBeDisabled();
  });
});
