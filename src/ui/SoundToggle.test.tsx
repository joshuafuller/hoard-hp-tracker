import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __resetSoundPreference,
  MUTE_STORAGE_KEY,
} from "../sound/soundSettings";
import { SoundToggle } from "./SoundToggle";

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

  it("renders enabled (pressed) by default", () => {
    render(<SoundToggle />);
    expect(button()).toHaveAttribute("aria-pressed", "true");
  });

  it("reflects a persisted muted preference as not-pressed", () => {
    localStorage.setItem(MUTE_STORAGE_KEY, "true");
    render(<SoundToggle />);
    expect(button()).toHaveAttribute("aria-pressed", "false");
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
