import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CoinToken } from "./CoinToken";

describe("CoinToken", () => {
  it("renders an accessible, labelled button carrying the chosen sigil", () => {
    render(<CoinToken sigil="damage" label="Damage" />);
    const btn = screen.getByRole("button", { name: "Damage" });
    expect(btn).toHaveAttribute("data-sigil", "damage");
    // the sigil is rendered as an inline svg (so it inherits currentColor / foil engraving)
    expect(btn.querySelector("svg")).toBeTruthy();
  });

  it("hides the sigil graphic from assistive tech (label carries the meaning)", () => {
    render(<CoinToken sigil="heal" label="Heal" />);
    const face = screen.getByRole("button", { name: "Heal" }).querySelector(".coin-token__face");
    expect(face).toHaveAttribute("aria-hidden", "true");
  });

  it("fires onClick when pressed", async () => {
    const onClick = vi.fn();
    render(<CoinToken sigil="coins" label="Coins" onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: "Coins" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("can be disabled and then does not fire", async () => {
    const onClick = vi.fn();
    render(<CoinToken sigil="temp" label="Temp HP" disabled onClick={onClick} />);
    const btn = screen.getByRole("button", { name: "Temp HP" });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});
