import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RepoLink, REPO_URL } from "./RepoLink";

describe("RepoLink", () => {
  it("is an accessible new-tab link to the source repo with an inline (offline) icon", () => {
    render(<RepoLink />);
    const link = screen.getByRole("link", { name: /view source on github/i });
    expect(link).toHaveAttribute("href", REPO_URL);
    expect(REPO_URL).toMatch(/^https:\/\/github\.com\//);
    expect(link).toHaveAttribute("target", "_blank");
    // rel must include noopener (security for target=_blank).
    expect(link.getAttribute("rel")).toContain("noopener");
    // Icon is a bundled inline SVG — no third-party request, works offline.
    expect(link.querySelector("svg")).toBeTruthy();
  });
});
