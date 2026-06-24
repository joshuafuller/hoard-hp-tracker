import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tour } from "./Tour";
import { hasSeenTour, type TourStep } from "./tour";

const KEY = "hoard-tour-test";
const STEPS: TourStep[] = [
  { target: "#orb", title: "The orb", caption: "Your HP." },
  { target: "#hub", caption: "Actions live here." },
];

beforeEach(() => {
  localStorage.clear();
  // Append the spotlight targets WITHOUT wiping body (wiping fights React's portal +
  // RTL's container cleanup → "node to be removed is not a child"). createElement, not
  // innerHTML/insertAdjacentHTML (no markup parsing).
  for (const id of ["orb", "hub"]) {
    const el = document.createElement("div");
    el.id = id;
    document.body.appendChild(el);
  }
});
afterEach(() => {
  localStorage.clear();
  document.getElementById("orb")?.remove();
  document.getElementById("hub")?.remove();
});

describe("Tour engine (#177)", () => {
  it("shows the first step's caption, a spotlight over its target, + a click blocker", () => {
    render(<Tour steps={STEPS} seenKey={KEY} onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: /feature tour/i })).toBeInTheDocument();
    expect(screen.getByText("Your HP.")).toBeInTheDocument();
    expect(screen.getByTestId("tour-spotlight")).toBeInTheDocument();
    expect(screen.getByTestId("tour-block")).toBeInTheDocument(); // blocks background taps (Codex)
  });

  it("restores focus to the launching element when it closes (Copilot a11y)", () => {
    const launcher = document.createElement("button");
    document.body.appendChild(launcher);
    launcher.focus();
    const { unmount } = render(<Tour steps={STEPS} seenKey={KEY} onClose={() => {}} />);
    expect(document.activeElement).not.toBe(launcher); // focus moved into the card
    unmount();
    expect(document.activeElement).toBe(launcher); // …and back to the launcher on close
    launcher.remove();
  });

  it("Next advances, Back retreats (no Back on the first step)", () => {
    render(<Tour steps={STEPS} seenKey={KEY} onClose={() => {}} />);
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Actions live here.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Your HP.")).toBeInTheDocument();
  });

  it("Skip ends the tour and persists 'seen'", () => {
    const onClose = vi.fn();
    render(<Tour steps={STEPS} seenKey={KEY} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(hasSeenTour(KEY)).toBe(true);
  });

  it("Done on the last step ends + persists; Escape also skips", () => {
    const onClose = vi.fn();
    const { unmount } = render(<Tour steps={STEPS} seenKey={KEY} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" })); // to last step
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(hasSeenTour(KEY)).toBe(true);
    unmount();
    localStorage.clear();

    const onClose2 = vi.fn();
    render(<Tour steps={STEPS} seenKey={KEY} onClose={onClose2} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose2).toHaveBeenCalledTimes(1);
    expect(hasSeenTour(KEY)).toBe(true);
  });
});
