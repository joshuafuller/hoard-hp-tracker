import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AboutPanel, REPO_URL } from "./AboutPanel";
import { SHARE_URL } from "./shareHoard";

const origShare = (navigator as Navigator).share;
const origClipboard = navigator.clipboard;

describe("AboutPanel", () => {
  afterEach(() => {
    Object.defineProperty(navigator, "share", { value: origShare, configurable: true });
    Object.defineProperty(navigator, "clipboard", { value: origClipboard, configurable: true });
  });

  it("is a dialog with an accessible new-tab link to the source repo (inline, offline-safe icon)", () => {
    render(<AboutPanel onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: /about/i })).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /view source on github/i });
    expect(link).toHaveAttribute("href", REPO_URL);
    expect(REPO_URL).toMatch(/^https:\/\/github\.com\//);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.querySelector("svg")).toBeTruthy();
  });

  it("shows the running, build-injected app version (#166)", () => {
    render(<AboutPanel onClose={vi.fn()} />);
    // A semver line like "v1.0.0", injected at build from package.json (no manual edit).
    expect(screen.getByText(/^v\d+\.\d+\.\d+/)).toBeInTheDocument();
  });

  it("shares the app — copies the link and confirms when there's no native share sheet (#183)", async () => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<AboutPanel onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /share hoard/i }));
    expect(writeText).toHaveBeenCalledWith(SHARE_URL);
    expect(await screen.findByText(/link copied/i)).toBeInTheDocument();
  });

  it("closes on the close button, the backdrop, and Escape", async () => {
    const onClose = vi.fn();
    const { rerender } = render(<AboutPanel onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<AboutPanel onClose={onClose} />);
    await userEvent.click(screen.getByTestId("about-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
