import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AboutPanel, REPO_URL } from "./AboutPanel";

describe("AboutPanel", () => {
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
