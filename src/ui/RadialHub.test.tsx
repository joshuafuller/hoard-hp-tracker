import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RadialHub } from "./RadialHub";

/**
 * Slice 1 of the radial action hub (#74): the single hub control + its fan of
 * secondary actions (Coins, Dice, Rests, Concentration), with open / select /
 * cancel and a keyboard-accessible path. Wiring into App + the About panel
 * (sound + repo link) is slice 2.
 */
function handlers() {
  return { onCoins: vi.fn(), onDice: vi.fn(), onRests: vi.fn(), onConcentration: vi.fn() };
}

describe("RadialHub", () => {
  it("shows a single hub control at rest; the action fan is hidden", () => {
    render(<RadialHub {...handlers()} />);
    expect(screen.getByRole("button", { name: /actions/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^coins$/i })).not.toBeInTheDocument();
  });

  it("opens the fan on activating the hub and reveals the four actions", async () => {
    render(<RadialHub {...handlers()} />);
    await userEvent.click(screen.getByRole("button", { name: /actions/i }));
    expect(screen.getByRole("button", { name: /^coins$/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /^dice$/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /^rest/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /^concentration$/i })).toBeVisible();
  });

  it("fires the chosen action and closes the fan on selecting an item", async () => {
    const h = handlers();
    render(<RadialHub {...h} />);
    await userEvent.click(screen.getByRole("button", { name: /actions/i }));
    await userEvent.click(screen.getByRole("button", { name: /^coins$/i }));
    expect(h.onCoins).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /^dice$/i })).not.toBeInTheDocument();
  });

  it("closes the fan on Escape without firing an action (cancel)", async () => {
    const h = handlers();
    render(<RadialHub {...h} />);
    await userEvent.click(screen.getByRole("button", { name: /actions/i }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("button", { name: /^coins$/i })).not.toBeInTheDocument();
    expect(h.onCoins).not.toHaveBeenCalled();
  });

  it("exposes the hub's expanded state via aria-expanded for AT", async () => {
    render(<RadialHub {...handlers()} />);
    const hub = screen.getByRole("button", { name: /actions/i });
    expect(hub).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(hub);
    expect(hub).toHaveAttribute("aria-expanded", "true");
  });
});
