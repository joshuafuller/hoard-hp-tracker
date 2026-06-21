import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DiceToken } from "./DiceToken";

describe("DiceToken", () => {
  it("renders an accessible d20 token that opens the tray", async () => {
    const onOpen = vi.fn();
    render(<DiceToken onOpen={onOpen} />);
    const btn = screen.getByRole("button", { name: /roll dice/i });
    await userEvent.click(btn);
    expect(onOpen).toHaveBeenCalled();
  });
});
