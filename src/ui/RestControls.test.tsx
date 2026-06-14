import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { RestControls } from "./RestControls";

const noop = () => {};

function renderControls(props: Partial<ComponentProps<typeof RestControls>> = {}) {
  return render(
    <RestControls
      hitDiceAvailable={3}
      onShortRest={noop}
      onLongRest={noop}
      {...props}
    />,
  );
}

describe("RestControls", () => {
  it("fires onShortRest when Short Rest is pressed with dice available", async () => {
    const onShortRest = vi.fn();
    renderControls({ hitDiceAvailable: 3, onShortRest });
    await userEvent.click(screen.getByRole("button", { name: /short rest/i }));
    expect(onShortRest).toHaveBeenCalledTimes(1);
  });

  it("disables Short Rest when no Hit Dice remain", () => {
    renderControls({ hitDiceAvailable: 0 });
    expect(screen.getByRole("button", { name: /short rest/i })).toBeDisabled();
  });

  it("does not fire onLongRest on the first press (confirm required)", async () => {
    const onLongRest = vi.fn();
    renderControls({ onLongRest });
    await userEvent.click(screen.getByRole("button", { name: /long rest/i }));
    expect(onLongRest).not.toHaveBeenCalled();
  });

  it("fires onLongRest after confirming", async () => {
    const onLongRest = vi.fn();
    renderControls({ onLongRest });
    await userEvent.click(screen.getByRole("button", { name: /long rest/i }));
    await userEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(onLongRest).toHaveBeenCalledTimes(1);
  });

  it("lets the user cancel the Long Rest confirmation without firing", async () => {
    const onLongRest = vi.fn();
    renderControls({ onLongRest });
    await userEvent.click(screen.getByRole("button", { name: /long rest/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onLongRest).not.toHaveBeenCalled();
    // After cancelling, the Long Rest button is available again.
    expect(screen.getByRole("button", { name: /long rest/i })).toBeInTheDocument();
  });

  it("restores focus to the Long Rest button after cancelling", async () => {
    renderControls();
    await userEvent.click(screen.getByRole("button", { name: /long rest/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.getByRole("button", { name: /long rest/i })).toHaveFocus();
  });
});
