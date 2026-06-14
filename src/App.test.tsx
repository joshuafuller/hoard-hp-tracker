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
});
