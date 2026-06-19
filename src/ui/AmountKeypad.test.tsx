import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AmountKeypad } from "./AmountKeypad";

const tap = (n: string | RegExp) => userEvent.click(screen.getByRole("button", { name: n }));

describe("AmountKeypad", () => {
  it("renders the configured actions and commits the typed amount", async () => {
    const add = vi.fn(), onClose = vi.fn();
    render(<AmountKeypad ariaLabel="Gold coins" context="Gold" closeOnCommit={false}
      primary={[{ label: () => "Add", ariaLabel: "Add", tone: "add", gate: "positive", onCommit: add }]} onClose={onClose} />);
    await tap("9"); await tap(/^add$/i);
    expect(add).toHaveBeenCalledWith(9);
  });

  it("keeps the sheet open and resets the amount when closeOnCommit is false", async () => {
    const add = vi.fn(), onClose = vi.fn();
    render(<AmountKeypad ariaLabel="Gold coins" context="Gold" closeOnCommit={false}
      primary={[{ label: () => "Add", ariaLabel: "Add", gate: "positive", onCommit: add }]} onClose={onClose} />);
    await tap("5"); await tap(/^add$/i);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId("keypad-amount")).toHaveTextContent("0");
  });

  it("closes after commit when closeOnCommit is true", async () => {
    const add = vi.fn(), onClose = vi.fn();
    render(<AmountKeypad ariaLabel="x" context="x" closeOnCommit
      primary={[{ label: () => "Add", ariaLabel: "Add", gate: "positive", onCommit: add }]} onClose={onClose} />);
    await tap("3"); await tap(/^add$/i);
    expect(onClose).toHaveBeenCalled();
  });

  it("renders an optional header above the amount", () => {
    render(<AmountKeypad ariaLabel="x" context="x" header={<div>switcher-slot</div>}
      primary={[{ label: () => "Add", gate: "positive", onCommit: vi.fn() }]} onClose={vi.fn()} />);
    expect(screen.getByText("switcher-slot")).toBeInTheDocument();
  });
});
