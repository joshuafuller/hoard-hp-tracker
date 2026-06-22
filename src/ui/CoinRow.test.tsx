import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CoinRow } from "./CoinRow";
import { playSfx } from "../sound/sfx";

vi.mock("../sound/sfx", () => ({ playSfx: vi.fn() }));

function setup(over = {}) {
  const props = {
    kind: "gp" as const,
    label: "Gold",
    unit: "gp",
    count: 5,
    canSpend: true,
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

  it("plays the rising add / falling spend coin cues (#90)", async () => {
    vi.mocked(playSfx).mockClear();
    setup();
    await userEvent.click(screen.getByRole("button", { name: /add 1 gold/i }));
    expect(playSfx).toHaveBeenLastCalledWith("coinAdd");
    await userEvent.click(screen.getByRole("button", { name: /spend 1 gold/i }));
    expect(playSfx).toHaveBeenLastCalledWith("coinSpend");
  });

  it("disables the − stepper only when the purse can't cover a spend", () => {
    setup({ count: 0, canSpend: false });
    expect(screen.getByRole("button", { name: /spend 1 gold/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /add 1 gold/i })).toBeEnabled();
  });

  it("enables the − stepper for cross-denomination spend even at zero count", () => {
    // 0 gp held, but the purse can convert (canSpend) → spend must stay available
    setup({ count: 0, canSpend: true });
    expect(screen.getByRole("button", { name: /spend 1 gold/i })).toBeEnabled();
  });
});
