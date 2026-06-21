import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DiceResult } from "./DiceResult";
import type { RollRecord } from "../../domain/dice";

const advRecord: RollRecord = {
  notation: "2d20kh1+5",
  total: 23,
  result: [18],
  dice: [
    { sides: 20, value: 18, dropped: false },
    { sides: 20, value: 4, dropped: true },
  ],
};

describe("DiceResult", () => {
  it("shows the grand total and the notation", () => {
    render(<DiceResult record={advRecord} />);
    expect(screen.getByText("23")).toBeInTheDocument();
    expect(screen.getByText(/2d20kh1\+5/)).toBeInTheDocument();
  });

  it("renders every die, striking out the dropped one", () => {
    render(<DiceResult record={advRecord} />);
    const dropped = screen.getByTestId("die-4");
    expect(dropped).toHaveAttribute("data-dropped", "true");
    // dropped die is rendered inside a strikethrough <s> element
    expect(dropped.querySelector("s")).not.toBeNull();
    expect(screen.getByTestId("die-18")).toHaveAttribute("data-dropped", "false");
  });

  it("highlights a natural 20 (hit) and natural 1 (miss) on a d20", () => {
    const rec: RollRecord = {
      notation: "2d20",
      total: 21,
      result: [20, 1],
      dice: [
        { sides: 20, value: 20, dropped: false },
        { sides: 20, value: 1, dropped: false },
      ],
    };
    render(<DiceResult record={rec} />);
    expect(screen.getByTestId("die-20")).toHaveAttribute("data-crit", "hit");
    expect(screen.getByTestId("die-1")).toHaveAttribute("data-crit", "miss");
  });

  it("does not crit-highlight 1s/20s on non-d20 dice", () => {
    const rec: RollRecord = {
      notation: "2d6",
      total: 7,
      result: [1, 6],
      dice: [
        { sides: 6, value: 1, dropped: false },
        { sides: 6, value: 6, dropped: false },
      ],
    };
    render(<DiceResult record={rec} />);
    expect(screen.getByTestId("die-1")).not.toHaveAttribute("data-crit");
  });

  it("marks explosion-added dice with a +", () => {
    const rec: RollRecord = {
      notation: "1d6!",
      total: 9,
      result: [6, 3],
      dice: [
        { sides: 6, value: 6, dropped: false, exploded: true },
        { sides: 6, value: 3, dropped: false },
      ],
    };
    const { container } = render(<DiceResult record={rec} />);
    expect(container.querySelector(".dice-result__plus")).not.toBeNull();
  });

  it("offers Apply-as-heal (with the total) only when the handler is given", async () => {
    const onApplyHeal = vi.fn();
    const { rerender } = render(<DiceResult record={advRecord} onApplyHeal={onApplyHeal} />);
    const btn = screen.getByRole("button", { name: /apply.*heal/i });
    await userEvent.click(btn);
    expect(onApplyHeal).toHaveBeenCalledWith(23);

    rerender(<DiceResult record={advRecord} />);
    expect(screen.queryByRole("button", { name: /apply.*heal/i })).toBeNull();
  });
});
