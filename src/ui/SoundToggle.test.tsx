import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetSoundPreference,
  MUTE_STORAGE_KEY,
} from "../sound/soundSettings";
import { SoundToggle } from "./SoundToggle";
import { playSfx } from "../sound/sfx";

vi.mock("../sound/sfx", () => ({ playSfx: vi.fn() }));

beforeEach(() => {
  localStorage.clear();
  __resetSoundPreference();
});

afterEach(() => {
  localStorage.clear();
  __resetSoundPreference();
});

describe("SoundToggle", () => {
  // Stable accessible name; on/off conveyed via aria-pressed.
  const button = () => screen.getByRole("button", { name: /sound effects/i });

  it("plays toggle-on only when ENABLING; muting stays silent (#90)", async () => {
    vi.mocked(playSfx).mockClear();
    render(<SoundToggle />);
    // Default is ON, so the first tap MUTES — no cue should fire.
    await userEvent.click(button());
    expect(playSfx).not.toHaveBeenCalled();
    // Now OFF, so the next tap ENABLES — the toggle-on cue fires.
    await userEvent.click(button());
    expect(playSfx).toHaveBeenCalledWith("toggleOn");
  });

  it("renders enabled (pressed) by default", () => {
    render(<SoundToggle />);
    expect(button()).toHaveAttribute("aria-pressed", "true");
  });

  it("reflects a persisted muted preference as not-pressed", () => {
    localStorage.setItem(MUTE_STORAGE_KEY, "true");
    render(<SoundToggle />);
    expect(button()).toHaveAttribute("aria-pressed", "false");
  });

  it("shows the speaker icon when enabled and the muted icon when off", async () => {
    render(<SoundToggle />);
    const icon = () => button().querySelector("svg");
    expect(icon()).toHaveAttribute("data-icon", "speaker");
    await userEvent.click(button());
    expect(icon()).toHaveAttribute("data-icon", "speaker-off");
  });

  it("flips aria-pressed and persists the muted flag on click", async () => {
    render(<SoundToggle />);
    expect(button()).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(button());
    expect(button()).toHaveAttribute("aria-pressed", "false");
    expect(localStorage.getItem(MUTE_STORAGE_KEY)).toBe("true");

    await userEvent.click(button());
    expect(button()).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem(MUTE_STORAGE_KEY)).toBe("false");
  });
});
