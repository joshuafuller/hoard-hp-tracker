import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Dexie from "dexie";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { playSfx } from "./sound/sfx";
import { HP_DB_NAME } from "./store/db";

vi.mock("./sound/sfx", () => ({
  playSfx: vi.fn(),
  SFX_NAMES: [],
}));

// Integration: the composed app wires the Dexie store, the pure domain, and the
// Obsidian UI together. Each test starts from a fresh (re-seeded) database.
describe("App (integration)", () => {
  beforeEach(async () => {
    await Dexie.delete(HP_DB_NAME);
  });

  it("renders the seeded HP and the controls", async () => {
    render(<App />);
    expect(await screen.findByTestId("hp-current")).toBeInTheDocument();
    expect(screen.getByTestId("hp-bar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Damage 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Heal 1" })).toBeInTheDocument();
    // First-run seed is 10/10.
    expect(await screen.findByText("10")).toBeInTheDocument();
  });

  it("applies damage through the store to the display", async () => {
    render(<App />);
    await screen.findByText("10");
    await userEvent.click(screen.getByRole("button", { name: "Damage 1" }));
    expect(await screen.findByText("9")).toBeInTheDocument();
  });

  it("reveals death saves at 0 HP and reaches DEAD on three failures", async () => {
    render(<App />);
    await screen.findByText("10");
    expect(screen.queryByLabelText(/death saving throws/i)).not.toBeInTheDocument();

    // 10 -> 0 via two Damage 5 taps.
    await userEvent.click(screen.getByRole("button", { name: "Damage 5" }));
    await userEvent.click(screen.getByRole("button", { name: "Damage 5" }));

    expect(await screen.findByLabelText(/death saving throws/i)).toBeInTheDocument();

    await userEvent.click(await screen.findByRole("button", { name: /failure 3/i }));
    expect(await screen.findByText(/^dead$/i)).toBeInTheDocument();
  });

  it("plays a damage sound effect when damaging", async () => {
    render(<App />);
    await screen.findByText("10");
    await userEvent.click(screen.getByRole("button", { name: "Damage 1" }));
    expect(playSfx).toHaveBeenCalledWith("damage");
  });

  it("edits Max HP through the pill modal", async () => {
    render(<App />);
    await screen.findByText("10");
    await userEvent.click(screen.getByRole("button", { name: /edit maximum hp/i }));
    expect(await screen.findByRole("dialog", { name: /set max hp/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /increase max hp/i }));
    await waitFor(() => expect(screen.getByTestId("hp-max")).toHaveTextContent("11"));
    await userEvent.click(screen.getByRole("button", { name: /done/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("long rest (with confirm) restores HP to full", async () => {
    render(<App />);
    await screen.findByText("10");
    await userEvent.click(screen.getByRole("button", { name: "Damage 5" }));
    expect(await screen.findByText("5")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Long Rest" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm Long Rest" }));
    expect(await screen.findByText("10")).toBeInTheDocument();
  });

  // Anchor invariant (guards #12): the orb sits alone in `.hp-tracker__stage`
  // while the swappable hit-dice / death-saves panel lives in its OWN fixed slot
  // `.hp-tracker__panel`. Keeping them in separate rows is what stops the
  // DeathSaves↔HitDicePanel height swap from re-centring (and visibly moving)
  // the orb. jsdom can't measure layout, but it can guard the structure.
  it("keeps the orb in its own stage row, separate from the swappable panel", async () => {
    const { container } = render(<App />);
    await screen.findByText("10");

    const stage = container.querySelector(".hp-tracker__stage");
    const panel = container.querySelector(".hp-tracker__panel");
    expect(stage).not.toBeNull();
    expect(panel).not.toBeNull();

    // Orb is in the stage; the swappable panel is NOT inside the stage.
    // Target the orb by its `.vessel` root — the `hp-bar` testid is shared with
    // ui/HpBar, so a testid query would be ambiguous if both ever render.
    expect(stage!.querySelector(".vessel")).not.toBeNull();
    expect(stage!.querySelector(".hit-dice, .death-saves")).toBeNull();

    // Alive: the hit-dice panel occupies the dedicated slot.
    expect(panel!.querySelector(".hit-dice")).not.toBeNull();

    // Dying: the death-saves panel takes the SAME slot, orb still alone in stage.
    await userEvent.click(screen.getByRole("button", { name: "Damage 5" }));
    await userEvent.click(screen.getByRole("button", { name: "Damage 5" }));
    await screen.findByLabelText(/death saving throws/i);
    expect(panel!.querySelector(".death-saves")).not.toBeNull();
    expect(stage!.querySelector(".death-saves")).toBeNull();
    expect(stage!.querySelector(".vessel")).not.toBeNull();
  });

  // Guards the Codex P2: the fixed panel slot is a shared scroll container for
  // both Hit Dice and Death Saves. If the user scrolls it while on Hit Dice and
  // then drops to 0, Death Saves must mount at the top of the slot, not into a
  // stale scroll offset that hides its heading/pips.
  it("resets the panel slot scroll when the panel contents swap", async () => {
    const { container } = render(<App />);
    await screen.findByText("10");
    const panel = container.querySelector(".hp-tracker__panel") as HTMLElement;
    panel.scrollTop = 60; // user scrolled the hit-dice slot

    // 10 -> 0 mounts DeathSaves into the SAME scroll container.
    await userEvent.click(screen.getByRole("button", { name: "Damage 5" }));
    await userEvent.click(screen.getByRole("button", { name: "Damage 5" }));
    await screen.findByLabelText(/death saving throws/i);

    expect(panel.scrollTop).toBe(0);
  });

  it("hides death saves after healing back above 0", async () => {
    render(<App />);
    await screen.findByText("10");
    await userEvent.click(screen.getByRole("button", { name: "Damage 5" }));
    await userEvent.click(screen.getByRole("button", { name: "Damage 5" }));
    await screen.findByLabelText(/death saving throws/i);

    await userEvent.click(screen.getByRole("button", { name: "Heal 5" }));
    await waitFor(() =>
      expect(screen.queryByLabelText(/death saving throws/i)).not.toBeInTheDocument(),
    );
  });

  it("opens the keypad from the HP number and applies typed damage", async () => {
    render(<App />);
    await screen.findByText("10");
    await userEvent.click(screen.getByRole("button", { name: /edit current hp/i }));
    const dialog = await screen.findByRole("dialog", { name: /amount|hp/i });
    expect(dialog).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "6" }));
    await userEvent.click(screen.getByRole("button", { name: /^damage/i }));
    expect(await screen.findByText("4")).toBeInTheDocument(); // 10 - 6
    await waitFor(() => expect(screen.queryByRole("dialog", { name: /amount|hp/i })).not.toBeInTheDocument());
  });

  it("shows an Undo pill after a change and reverts it", async () => {
    render(<App />);
    await screen.findByText("10");
    await userEvent.click(screen.getByRole("button", { name: /edit current hp/i }));
    await userEvent.click(screen.getByRole("button", { name: "6" }));
    await userEvent.click(screen.getByRole("button", { name: /^damage/i }));
    await screen.findByText("4");
    await userEvent.click(await screen.findByRole("button", { name: /undo/i }));
    expect(await screen.findByText("10")).toBeInTheDocument();
  });

  it("labels the undo pill for a heal", async () => {
    render(<App />);
    await screen.findByText("10");
    await userEvent.click(screen.getByRole("button", { name: /edit current hp/i }));
    await userEvent.click(screen.getByRole("button", { name: "3" }));
    await userEvent.click(screen.getByRole("button", { name: /^heal/i }));
    expect(await screen.findByText(/healed \+3/i)).toBeInTheDocument();
  });

  it("still opens the set-max editor from the /max number", async () => {
    render(<App />);
    await screen.findByText("10");
    await userEvent.click(screen.getByRole("button", { name: /edit maximum hp/i }));
    expect(await screen.findByRole("dialog", { name: /set max hp/i })).toBeInTheDocument();
  });

  it("sets temp HP via the keypad from the temp badge (US-5)", async () => {
    render(<App />);
    await screen.findByText("10");
    await userEvent.click(screen.getByRole("button", { name: /edit temporary hp/i }));
    await screen.findByRole("dialog", { name: /amount|hp/i });
    await userEvent.click(screen.getByRole("button", { name: "9" }));
    await userEvent.click(screen.getByRole("button", { name: /^temp/i }));
    await waitFor(() => expect(screen.getByTestId("hp-temp-badge")).toHaveTextContent("9"));
  });

  it("opens the coin sheet from the chrome and adds gold", async () => {
    render(<App />);
    await screen.findByText("10");
    await userEvent.click(screen.getByRole("button", { name: /^coins$/i }));
    expect(await screen.findByRole("dialog", { name: /coins/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /gold/i }));
    await userEvent.click(screen.getByRole("button", { name: "8" }));
    await userEvent.click(screen.getByRole("button", { name: /^add$/i }));
    // committing returns to the rows; the Gold row now shows 8 (seed 0 → 8)
    await waitFor(() => expect(screen.getByRole("button", { name: /gold — 8 gp/i })).toBeInTheDocument());
  });
});
