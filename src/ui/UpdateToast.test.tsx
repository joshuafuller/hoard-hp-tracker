import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { UpdateToast, VERSION_KEY } from "./UpdateToast";

const KEY = VERSION_KEY; // base-scoped (Copilot #206) — derive it, don't hard-code

describe("UpdateToast", () => {
  beforeEach(() => localStorage.clear());

  it("announces the new version when the stored one is older, and is dismissible (#167)", async () => {
    localStorage.setItem(KEY, "0.0.0"); // older than the build's __APP_VERSION__
    render(<UpdateToast />);
    const toast = await screen.findByRole("status");
    expect(toast).toHaveTextContent(/updated to v/i);
    // records the current version so the next load is silent
    expect(localStorage.getItem(KEY)).not.toBe("0.0.0");
    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows nothing on first install (no stored version) but records it", () => {
    render(<UpdateToast />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(localStorage.getItem(KEY)).toBeTruthy();
  });

  it("shows nothing on a plain reload (stored equals current)", () => {
    localStorage.setItem(KEY, __APP_VERSION__);
    render(<UpdateToast />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
