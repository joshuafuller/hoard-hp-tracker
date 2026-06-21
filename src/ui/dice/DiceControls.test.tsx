import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DiceControls } from "./DiceControls";
import { poolToNotation, type DiePool } from "../../domain/dice";

const setup = (over: Partial<React.ComponentProps<typeof DiceControls>> = {}) => {
  const pool = (over.pool ?? []) as DiePool;
  const modifier = over.modifier ?? 0;
  const mode = over.mode ?? "normal";
  const props = {
    pool,
    modifier,
    mode,
    rolling: false,
    // by default the notation mirrors the built pool (as the tray keeps it)
    notation: over.notation ?? poolToNotation(pool, modifier, mode),
    onAddDie: vi.fn(),
    onRemoveDie: vi.fn(),
    onClear: vi.fn(),
    onStepModifier: vi.fn(),
    onSetMode: vi.fn(),
    onRoll: vi.fn(),
    onNotationChange: vi.fn(),
    ...over,
  };
  render(<DiceControls {...props} />);
  return props;
};

describe("DiceControls (pool builder)", () => {
  it("adds a die when its chip is tapped", async () => {
    const { onAddDie } = setup();
    for (const s of [4, 6, 8, 10, 12, 20, 100]) {
      expect(screen.getByRole("button", { name: `Add d${s}` })).toBeInTheDocument();
    }
    await userEvent.click(screen.getByRole("button", { name: "Add d6" }));
    expect(onAddDie).toHaveBeenCalledWith(6);
  });

  it("shows a count badge and the built notation for the current pool", () => {
    setup({ pool: [{ sides: 6, count: 2 }, { sides: 4, count: 1 }], modifier: 3 });
    expect(screen.getByRole("textbox", { name: /dice notation/i })).toHaveValue("2d6+1d4+3");
    expect(screen.getByRole("button", { name: "Add d6" })).toHaveTextContent("2");
  });

  it("lets you type notation directly into the same expression field (no separate panel)", async () => {
    const { onNotationChange } = setup({ pool: [{ sides: 20, count: 1 }] });
    const field = screen.getByRole("textbox", { name: /dice notation/i });
    await userEvent.type(field, "!");
    expect(onNotationChange).toHaveBeenCalled();
  });

  it("removes one die when its pool tag is tapped", async () => {
    const { onRemoveDie } = setup({ pool: [{ sides: 6, count: 2 }] });
    await userEvent.click(screen.getByRole("button", { name: /remove one d6/i }));
    expect(onRemoveDie).toHaveBeenCalledWith(6);
  });

  it("hides the removable tags when the notation has been hand-edited", () => {
    // notation diverges from the built pool → manual mode → no tags
    setup({ pool: [{ sides: 6, count: 2 }], notation: "3d6!" });
    expect(screen.queryByRole("button", { name: /remove one d6/i })).toBeNull();
  });

  it("clears the pool (Clear shown only when there's something to clear)", async () => {
    const { onClear } = setup({ pool: [{ sides: 20, count: 1 }] });
    await userEvent.click(screen.getByRole("button", { name: /clear dice/i }));
    expect(onClear).toHaveBeenCalled();
  });

  it("hides Clear and disables Throw when the field is empty", () => {
    setup({ pool: [], notation: "" });
    expect(screen.queryByRole("button", { name: /clear dice/i })).toBeNull();
    expect(screen.getByRole("button", { name: /^throw/i })).toBeDisabled();
  });

  it("enables advantage only for a lone d20", async () => {
    const { onSetMode } = setup({ pool: [{ sides: 20, count: 1 }], mode: "normal" });
    const adv = screen.getByRole("button", { name: /^advantage/i });
    expect(adv).toBeEnabled();
    await userEvent.click(adv);
    expect(onSetMode).toHaveBeenCalledWith("advantage");
  });

  it("disables the advantage segment when the pool is not a lone d20", () => {
    setup({ pool: [{ sides: 6, count: 2 }] });
    expect(screen.getByRole("button", { name: /^advantage/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^disadvantage/i })).toBeDisabled();
  });

  it("steps the modifier and rolls", async () => {
    const { onStepModifier, onRoll } = setup({ pool: [{ sides: 20, count: 1 }], modifier: 5 });
    expect(screen.getByText("+5")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /increase modifier/i }));
    expect(onStepModifier).toHaveBeenCalledWith(1);
    await userEvent.click(screen.getByRole("button", { name: /^throw/i }));
    expect(onRoll).toHaveBeenCalled();
  });
});
