import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WhatsNew } from "./WhatsNew";
import { CHANGELOG } from "./changelogData";
import type { ChangelogEntry } from "./changelog";

const ENTRIES: ChangelogEntry[] = [
  {
    version: "0.0.6",
    date: "2026-06-23",
    sections: [{ title: "Fixed", items: [{ scope: "about", text: "close ✕ fixed", refs: ["#249", "#250"] }] }],
  },
];

describe("WhatsNew (#209, #266)", () => {
  it("renders the version, section, a scope TAG + capitalized prose, and DROPS issue refs", () => {
    render(<WhatsNew entries={ENTRIES} onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: /what.s new/i })).toBeInTheDocument();
    expect(screen.getByText(/v0\.0\.6/)).toBeInTheDocument();
    expect(screen.getByText("Fixed")).toBeInTheDocument();
    expect(screen.getByText("about")).toBeInTheDocument(); // scope as a category tag (no colon)
    expect(screen.getByText("Close ✕ fixed")).toBeInTheDocument(); // capitalized, scope stripped
    expect(screen.queryByText(/#249/)).toBeNull(); // issue refs are gone from the player view
  });

  it("shows only recent versions until 'Show older' (#266)", () => {
    const many: ChangelogEntry[] = Array.from({ length: 5 }, (_, i) => ({
      version: `0.0.${9 - i}`,
      date: "2026-06-23",
      sections: [{ title: "Added", items: [{ text: `note ${i}`, refs: [] }] }],
    }));
    render(<WhatsNew entries={many} onClose={() => {}} />);
    expect(screen.getByText("v0.0.9")).toBeInTheDocument();
    expect(screen.queryByText("v0.0.5")).toBeNull(); // beyond the recent window
    fireEvent.click(screen.getByRole("button", { name: /show 2 older/i }));
    expect(screen.getByText("v0.0.5")).toBeInTheDocument();
    // Focus moved to a stable control (the button unmounted) — not dropped to <body> (Copilot).
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));
  });

  it("closes via the ✕, the backdrop, and Escape", () => {
    const onClose = vi.fn();
    render(<WhatsNew entries={ENTRIES} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByTestId("whatsnew-backdrop"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("shows an empty state when there are no entries", () => {
    render(<WhatsNew entries={[]} onClose={() => {}} />);
    expect(screen.getByText(/no release notes/i)).toBeInTheDocument();
  });

  it("renders the real bundled changelog with no React duplicate-key warnings (#261)", () => {
    const realError = console.error.bind(console);
    const keyWarnings: unknown[][] = [];
    // Capture only duplicate-key warnings; forward any OTHER console.error to the real
    // console so genuine errors still surface (Copilot #275). Restore in finally so an
    // assertion failure can't leak the spy into later tests.
    const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      if (/same key|duplicate key/i.test(String(args[0]))) keyWarnings.push(args);
      else realError(...(args as Parameters<typeof console.error>));
    });
    try {
      render(<WhatsNew entries={CHANGELOG} onClose={() => {}} />);
      expect(keyWarnings).toEqual([]);
    } finally {
      spy.mockRestore();
    }
  });
});
