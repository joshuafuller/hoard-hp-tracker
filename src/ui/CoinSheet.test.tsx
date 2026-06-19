import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CoinSheet } from "./CoinSheet";

function setup(over = {}) {
  const props = { pp: 2, gp: 41, sp: 12, cp: 30, total: 62.5, onAdd: vi.fn(), onSpend: vi.fn(), onSet: vi.fn(), onClose: vi.fn(), ...over };
  render(<CoinSheet {...props} />);
  return props;
}

describe("CoinSheet", () => {
  it("shows the four denominations and the gold total", () => {
    setup();
    expect(screen.getByRole("dialog", { name: /coins/i })).toBeInTheDocument();
    expect(screen.getByText(/62\.5/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /platinum/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /gold/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /silver/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copper/i })).toBeInTheDocument();
  });

  it("opens the keypad for a denomination and adds the typed amount", async () => {
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: /gold/i }));
    await userEvent.click(screen.getByRole("button", { name: "7" }));
    await userEvent.click(screen.getByRole("button", { name: /^add$/i }));
    expect(p.onAdd).toHaveBeenCalledWith("gp", 7);
  });

  it("spends from a denomination", async () => {
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: /silver/i }));
    await userEvent.click(screen.getByRole("button", { name: "3" }));
    await userEvent.click(screen.getByRole("button", { name: /^spend$/i }));
    expect(p.onSpend).toHaveBeenCalledWith("sp", 3);
  });

  it("closes on backdrop click", async () => {
    const p = setup();
    await userEvent.click(screen.getByTestId("coin-backdrop"));
    expect(p.onClose).toHaveBeenCalled();
  });
});
