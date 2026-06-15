import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UndoPill } from "./UndoPill";

describe("UndoPill", () => {
  afterEach(() => vi.useRealTimers());

  it("renders the label and reverts on tap", async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn(), onDismiss = vi.fn();
    render(<UndoPill label="Healed +9" onUndo={onUndo} onDismiss={onDismiss} />);
    expect(screen.getByText("Healed +9")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /undo/i }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it("auto-dismisses after the timeout", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<UndoPill label="Took 6" onUndo={vi.fn()} onDismiss={onDismiss} />);
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(4000); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
