import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { DeathSaves } from "./DeathSaves";

const noop = () => {};

function renderPanel(props: Partial<ComponentProps<typeof DeathSaves>> = {}) {
  return render(
    <DeathSaves
      successes={0}
      failures={0}
      status="dying"
      onSetSuccesses={noop}
      onSetFailures={noop}
      onRoll={noop}
      {...props}
    />,
  );
}

describe("DeathSaves", () => {
  it("reflects the filled pips for each track", () => {
    renderPanel({ successes: 2, failures: 1 });
    expect(screen.getByRole("button", { name: /success 1/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /success 2/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /success 3/i })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /failure 1/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /failure 2/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("sets the track to the tapped pip index", async () => {
    const onSetSuccesses = vi.fn();
    renderPanel({ successes: 0, onSetSuccesses });
    await userEvent.click(screen.getByRole("button", { name: /success 2/i }));
    expect(onSetSuccesses).toHaveBeenCalledWith(2);
  });

  it("clears the top pip when tapping the highest filled pip", async () => {
    const onSetFailures = vi.fn();
    renderPanel({ failures: 2, onSetFailures });
    await userEvent.click(screen.getByRole("button", { name: /failure 2/i }));
    expect(onSetFailures).toHaveBeenCalledWith(1);
  });

  it("rolls a d20 when the roll button is pressed", async () => {
    const onRoll = vi.fn();
    renderPanel({ onRoll });
    await userEvent.click(screen.getByRole("button", { name: /roll/i }));
    expect(onRoll).toHaveBeenCalledTimes(1);
  });

  it("shows STABILIZED and locks controls when stable", () => {
    renderPanel({ successes: 3, status: "stable" });
    expect(screen.getByText(/stabilized/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /roll/i })).toBeDisabled();
  });

  it("shows DEAD and locks controls when dead", () => {
    renderPanel({ failures: 3, status: "dead" });
    expect(screen.getByText(/^dead$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /roll/i })).toBeDisabled();
  });
});
