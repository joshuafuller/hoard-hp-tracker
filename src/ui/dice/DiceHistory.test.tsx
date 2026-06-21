import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DiceHistory } from "./DiceHistory";
import type { DiceRollRecord } from "../../store/db";

const rolls: DiceRollRecord[] = [
  { id: 3, at: 3, context: "ad-hoc", notation: "2d20kh1+5", total: 23, result: [18], dice: [{ sides: 20, value: 18, dropped: false }, { sides: 20, value: 4, dropped: true }] },
  { id: 2, at: 2, context: "death-save", notation: "1d20", total: 14, result: [14], dice: [{ sides: 20, value: 14, dropped: false }] },
  { id: 1, at: 1, context: "hit-die", notation: "1d8", total: 9, result: [7], dice: [{ sides: 8, value: 7, dropped: false }] },
];

describe("DiceHistory", () => {
  it("lists each roll's notation and total in the given (newest-first) order", () => {
    render(<DiceHistory rolls={rolls} onClear={vi.fn()} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("2d20kh1+5");
    expect(items[0]).toHaveTextContent("23");
    expect(items[2]).toHaveTextContent("1d8");
  });

  it("labels the death-save and hit-die context", () => {
    render(<DiceHistory rolls={rolls} onClear={vi.fn()} />);
    expect(screen.getByText(/death save/i)).toBeInTheDocument();
    expect(screen.getByText(/hit die/i)).toBeInTheDocument();
  });

  it("timestamps each roll with a relative 'how long ago' (and a clock time)", () => {
    const now = 1_000_000_000_000;
    const stamped: DiceRollRecord[] = [
      { ...rolls[0]!, at: now - 120_000 }, // 2 minutes ago
      { ...rolls[1]!, at: now - 2 * 3_600_000 }, // 2 hours ago
    ];
    render(<DiceHistory rolls={stamped} onClear={vi.fn()} now={now} />);
    expect(screen.getByText(/2m ago/)).toBeInTheDocument();
    expect(screen.getByText(/2h ago/)).toBeInTheDocument();
  });

  it("clears the history", async () => {
    const onClear = vi.fn();
    render(<DiceHistory rolls={rolls} onClear={onClear} />);
    await userEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(onClear).toHaveBeenCalled();
  });

  it("shows an empty state and no clear button when there are no rolls", () => {
    render(<DiceHistory rolls={[]} onClear={vi.fn()} />);
    expect(screen.getByText(/no rolls yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /clear/i })).toBeNull();
  });
});
