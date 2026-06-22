import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RadialHub } from "./RadialHub";

/**
 * The radial action hub (#74): one gold sigil replacing the chrome row. Its fan
 * holds Coins + Dice (actions), Concentration + Sound (toggles, reflecting state),
 * and About (opens the panel with the source-repo link). Rests stay in the footer.
 */
function props(over: Partial<Parameters<typeof RadialHub>[0]> = {}) {
  return {
    onCoins: vi.fn(),
    onDice: vi.fn(),
    onAbout: vi.fn(),
    concentrating: false,
    onToggleConcentration: vi.fn(),
    soundEnabled: true,
    onToggleSound: vi.fn(),
    ...over,
  };
}

describe("RadialHub", () => {
  it("shows a single hub control at rest; the fan is hidden", () => {
    render(<RadialHub {...props()} />);
    expect(screen.getByRole("button", { name: /actions/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^coins$/i })).not.toBeInTheDocument();
  });

  it("opens the fan and reveals Coins, Dice, Concentration, Sound, About", async () => {
    render(<RadialHub {...props()} />);
    await userEvent.click(screen.getByRole("button", { name: /actions/i }));
    expect(screen.getByRole("button", { name: /^coins$/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /^dice$/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /concentration/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /sound/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /about/i })).toBeVisible();
  });

  it("fires an action and closes the fan on select", async () => {
    const p = props();
    render(<RadialHub {...p} />);
    await userEvent.click(screen.getByRole("button", { name: /actions/i }));
    await userEvent.click(screen.getByRole("button", { name: /^coins$/i }));
    expect(p.onCoins).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /^dice$/i })).not.toBeInTheDocument();
  });

  it("fires About (the source-repo panel entry)", async () => {
    const p = props();
    render(<RadialHub {...p} />);
    await userEvent.click(screen.getByRole("button", { name: /actions/i }));
    await userEvent.click(screen.getByRole("button", { name: /about/i }));
    expect(p.onAbout).toHaveBeenCalledTimes(1);
  });

  it("reflects toggle state via aria-pressed + label/icon and fires the toggle callbacks", async () => {
    const p = props({ concentrating: true, soundEnabled: false });
    render(<RadialHub {...p} />);
    await userEvent.click(screen.getByRole("button", { name: /actions/i }));
    expect(screen.getByRole("button", { name: /concentration/i })).toHaveAttribute("aria-pressed", "true");
    // Sound off → the chip reads "Muted" (not just a colour) and is aria-pressed=false.
    const sound = screen.getByRole("button", { name: /muted/i });
    expect(sound).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(sound);
    expect(p.onToggleSound).toHaveBeenCalledTimes(1);
  });

  it("labels the sound toggle by state — 'Sound' when on, 'Muted' when off", async () => {
    const { rerender } = render(<RadialHub {...props({ soundEnabled: true })} />);
    await userEvent.click(screen.getByRole("button", { name: /actions/i }));
    expect(screen.getByRole("button", { name: "Sound" })).toBeVisible();
    rerender(<RadialHub {...props({ soundEnabled: false })} />);
    expect(screen.getByRole("button", { name: "Muted" })).toBeVisible();
  });

  it("closes on Escape without firing an action (cancel)", async () => {
    const p = props();
    render(<RadialHub {...p} />);
    await userEvent.click(screen.getByRole("button", { name: /actions/i }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("button", { name: /^coins$/i })).not.toBeInTheDocument();
    expect(p.onCoins).not.toHaveBeenCalled();
  });

  it("closes on a tap outside the hub (tap-out cancel) without firing an action", async () => {
    const p = props();
    render(<RadialHub {...p} />);
    await userEvent.click(screen.getByRole("button", { name: /actions/i }));
    expect(screen.getByRole("button", { name: /^coins$/i })).toBeVisible();
    fireEvent.pointerDown(document.body); // a tap outside the hub
    expect(screen.queryByRole("button", { name: /^coins$/i })).not.toBeInTheDocument();
    expect(p.onCoins).not.toHaveBeenCalled();
  });

  it("exposes the hub's expanded state via aria-expanded", async () => {
    render(<RadialHub {...props()} />);
    const hub = screen.getByRole("button", { name: /actions/i });
    expect(hub).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(hub);
    expect(hub).toHaveAttribute("aria-expanded", "true");
  });
});
