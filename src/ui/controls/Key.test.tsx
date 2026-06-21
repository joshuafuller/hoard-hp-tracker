import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Key } from "./Key";

describe("Key (keypad key)", () => {
  it("renders its label as an accessible name", () => {
    render(<Key>7</Key>);
    expect(screen.getByRole("button", { name: "7" })).toBeInTheDocument();
  });

  it("prefers an explicit aria-label (e.g. for icon keys)", () => {
    render(<Key aria-label="Backspace">⌫</Key>);
    expect(screen.getByRole("button", { name: "Backspace" })).toBeInTheDocument();
  });

  it("defaults to the digit tone and supports muted/secondary tones", () => {
    const { rerender } = render(<Key>7</Key>);
    expect(screen.getByRole("button", { name: "7" })).toHaveAttribute(
      "data-tone",
      "digit",
    );
    rerender(<Key tone="muted">.</Key>);
    expect(screen.getByRole("button", { name: "." })).toHaveAttribute(
      "data-tone",
      "muted",
    );
  });

  it("fires onClick when pressed", async () => {
    const onClick = vi.fn();
    render(<Key onClick={onClick}>7</Key>);
    await userEvent.click(screen.getByRole("button", { name: "7" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Key disabled onClick={onClick}>
        7
      </Key>,
    );
    const key = screen.getByRole("button", { name: "7" });
    expect(key).toBeDisabled();
    await userEvent.click(key);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is type=button so a keypad inside a form never submits", () => {
    render(<Key>7</Key>);
    expect(screen.getByRole("button", { name: "7" })).toHaveAttribute(
      "type",
      "button",
    );
  });
});
