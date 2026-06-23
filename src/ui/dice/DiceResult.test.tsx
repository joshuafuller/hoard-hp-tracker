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
    // testids are index-based (die-0, die-1, …) so duplicate faces stay unique.
    const kept = screen.getByTestId("die-0");
    const dropped = screen.getByTestId("die-1");
    expect(kept).toHaveTextContent("18");
    expect(kept).toHaveAttribute("data-dropped", "false");
    expect(dropped).toHaveTextContent("4");
    expect(dropped).toHaveAttribute("data-dropped", "true");
    // dropped die is rendered inside a strikethrough <s> element
    expect(dropped.querySelector("s")).not.toBeNull();
  });

  it("gives each die a unique testid even when two faces match", () => {
    const rec: RollRecord = {
      notation: "2d6",
      total: 8,
      result: [4, 4],
      dice: [
        { sides: 6, value: 4, dropped: false },
        { sides: 6, value: 4, dropped: false },
      ],
    };
    render(<DiceResult record={rec} />);
    expect(screen.getByTestId("die-0")).toHaveTextContent("4");
    expect(screen.getByTestId("die-1")).toHaveTextContent("4");
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
    // die-0 is the nat 20, die-1 the nat 1 (index-based testids)
    expect(screen.getByTestId("die-0")).toHaveAttribute("data-crit", "hit");
    expect(screen.getByTestId("die-1")).toHaveAttribute("data-crit", "miss");
  });

  it("does not crit-highlight a DROPPED nat 20/1 (advantage's discarded d20) — #237", () => {
    const rec: RollRecord = {
      notation: "2d20kh1",
      total: 20,
      result: [20],
      dice: [
        { sides: 20, value: 20, dropped: false }, // kept nat 20 → hit
        { sides: 20, value: 1, dropped: true }, // dropped nat 1 → no crit (matches the sound gating)
      ],
    };
    render(<DiceResult record={rec} />);
    expect(screen.getByTestId("die-0")).toHaveAttribute("data-crit", "hit");
    expect(screen.getByTestId("die-1")).not.toHaveAttribute("data-crit");
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
    // die-0 is the d6 showing 1 — must not be crit-highlighted (not a d20)
    expect(screen.getByTestId("die-0")).not.toHaveAttribute("data-crit");
  });

  it("separates explosion rounds with exactly one + per boundary", () => {
    // 3d6! → round 1 = [6,2,6] (two exploded), round 2 = [4,1], round 3 = [3].
    const rec: RollRecord = {
      notation: "3d6!",
      total: 22,
      result: [6, 2, 6, 4, 1, 3],
      dice: [
        { sides: 6, value: 6, dropped: false, exploded: true }, // r1
        { sides: 6, value: 2, dropped: false }, // r1
        { sides: 6, value: 6, dropped: false, exploded: true }, // r1
        { sides: 6, value: 4, dropped: false, round: 2 }, // r2
        { sides: 6, value: 1, dropped: false, round: 2 }, // r2
        { sides: 6, value: 3, dropped: false, round: 3 }, // r3
      ],
    };
    const { container } = render(<DiceResult record={rec} />);
    // two round boundaries (r1→r2, r2→r3) → exactly two "+"
    expect(container.querySelectorAll(".dice-result__plus")).toHaveLength(2);
  });

  it("does not put a + between an explosion and a following normal die group (1d6!+1d4)", () => {
    // parser path order: d6 round 1, its explosion round 2, then the d4 (round 1 again).
    const rec: RollRecord = {
      notation: "1d6!+1d4",
      total: 13,
      result: [6, 3, 4],
      dice: [
        { sides: 6, value: 6, dropped: false, exploded: true }, // r1
        { sides: 6, value: 3, dropped: false, round: 2 }, // r2 (the explosion)
        { sides: 4, value: 4, dropped: false }, // r1 — different group, no "+"
      ],
    };
    const { container } = render(<DiceResult record={rec} />);
    // exactly one "+" (the round 1→2 increase), none for the 2→1 drop into the d4 group
    expect(container.querySelectorAll(".dice-result__plus")).toHaveLength(1);
  });

  it("shows no + for a single-round (non-exploding) roll", () => {
    const rec: RollRecord = {
      notation: "2d6+1d4",
      total: 12,
      result: [4, 6, 2],
      dice: [
        { sides: 6, value: 4, dropped: false },
        { sides: 6, value: 6, dropped: false },
        { sides: 4, value: 2, dropped: false },
      ],
    };
    const { container } = render(<DiceResult record={rec} />);
    expect(container.querySelectorAll(".dice-result__plus")).toHaveLength(0);
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
