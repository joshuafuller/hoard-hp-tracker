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
    render(<DiceHistory rolls={rolls} onClear={vi.fn()} onClose={vi.fn()} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("2d20kh1+5");
    expect(items[0]).toHaveTextContent("23");
    expect(items[2]).toHaveTextContent("1d8");
  });

  it("labels the death-save and hit-die context", () => {
    render(<DiceHistory rolls={rolls} onClear={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/death save/i)).toBeInTheDocument();
    expect(screen.getByText(/hit die/i)).toBeInTheDocument();
  });

  it("timestamps each roll with a relative 'how long ago' (and a clock time)", () => {
    const now = 1_000_000_000_000;
    const stamped: DiceRollRecord[] = [
      { ...rolls[0]!, at: now - 120_000 }, // 2 minutes ago
      { ...rolls[1]!, at: now - 2 * 3_600_000 }, // 2 hours ago
    ];
    render(<DiceHistory rolls={stamped} onClear={vi.fn()} onClose={vi.fn()} now={now} />);
    expect(screen.getByText(/2m ago/)).toBeInTheDocument();
    expect(screen.getByText(/2h ago/)).toBeInTheDocument();
  });

  it("closes the log from the X in the header", async () => {
    const onClose = vi.fn();
    render(<DiceHistory rolls={rolls} onClear={vi.fn()} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /close log/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("clears the history from a control separate from the close X", async () => {
    const onClear = vi.fn();
    render(<DiceHistory rolls={rolls} onClear={onClear} onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(onClear).toHaveBeenCalled();
  });

  it("shows a close X even when empty, but no clear button", () => {
    render(<DiceHistory rolls={[]} onClear={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/no rolls yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close log/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^clear/i })).toBeNull();
  });

  // #190 — order each roll's dice so a reader can walk them to the total: kept dice
  // ascending, then dropped dice (visually marked) last.
  it("sorts each roll's dice — kept ascending, dropped last — so it's walkable to the total (#190)", () => {
    // 4d6kh3 landed 3,1,6,4 (the 1 dropped); kept ascending reads 3 · 4 · 6 = 13,
    // NOT the roll order 3 · (1) · 6 · 4.
    const roll: DiceRollRecord = {
      id: 9,
      at: 9,
      context: "ad-hoc",
      notation: "4d6kh3",
      total: 13,
      result: [3, 4, 6],
      dice: [
        { sides: 6, value: 3, dropped: false },
        { sides: 6, value: 1, dropped: true },
        { sides: 6, value: 6, dropped: false },
        { sides: 6, value: 4, dropped: false },
      ],
    };
    const { container } = render(<DiceHistory rolls={[roll]} onClear={vi.fn()} onClose={vi.fn()} />);
    const summary = container.querySelector(".dice-history__dice");
    expect(summary?.textContent?.replace(/\s+/g, " ").trim()).toBe("3 · 4 · 6 · (1)");
    // the dropped die — and only it — is visually marked
    const dropped = container.querySelectorAll(".dice-history__die--dropped");
    expect(dropped).toHaveLength(1);
    expect(dropped[0]?.textContent).toContain("1");
  });
});
