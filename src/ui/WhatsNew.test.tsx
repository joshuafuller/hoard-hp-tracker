import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WhatsNew } from "./WhatsNew";
import type { ChangelogEntry } from "./changelog";

const ENTRIES: ChangelogEntry[] = [
  {
    version: "0.0.6",
    date: "2026-06-23",
    sections: [{ title: "Fixed", items: [{ text: "**about:** close ✕ fixed", refs: ["#249", "#250"] }] }],
  },
];

describe("WhatsNew (#209)", () => {
  it("renders the version, section, item (bold scope) + issue refs", () => {
    render(<WhatsNew entries={ENTRIES} onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: /what.s new/i })).toBeInTheDocument();
    expect(screen.getByText(/v0\.0\.6/)).toBeInTheDocument();
    expect(screen.getByText("Fixed")).toBeInTheDocument();
    expect(screen.getByText("about:")).toBeInTheDocument(); // bolded scope
    expect(screen.getByText(/close ✕ fixed/)).toBeInTheDocument();
    expect(screen.getByText(/#249, #250/)).toBeInTheDocument();
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
});
