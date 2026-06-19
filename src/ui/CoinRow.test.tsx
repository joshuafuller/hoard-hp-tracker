import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CoinRow } from "./CoinRow";

function setup(over = {}) {
  const props = {
    kind: "gp" as const,
    label: "Gold",
    unit: "gp",
    count: 5,
    onAdd: vi.fn(),
    onSpend: vi.fn(),
    onEdit: vi.fn(),
    ...over,
  };
  render(<CoinRow {...props} />);
  return props;
}

describe("CoinRow", () => {
  it("renders the count behind an edit affordance", () => {
    setup();
    expect(screen.getByRole("button", { name: /gold — 5 gp, edit/i })).toHaveTextContent("5");
  });

  it("fires add / spend / edit from the right controls", async () => {
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: /add 1 gold/i }));
    await userEvent.click(screen.getByRole("button", { name: /spend 1 gold/i }));
    await userEvent.click(screen.getByRole("button", { name: /gold — 5 gp, edit/i }));
    expect(p.onAdd).toHaveBeenCalledTimes(1);
    expect(p.onSpend).toHaveBeenCalledTimes(1);
    expect(p.onEdit).toHaveBeenCalledTimes(1);
  });

  it("disables the − stepper when the denomination is empty", () => {
    setup({ count: 0 });
    expect(screen.getByRole("button", { name: /spend 1 gold/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /add 1 gold/i })).toBeEnabled();
  });
});
