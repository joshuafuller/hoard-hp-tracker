import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { IconButton } from "./IconButton";
import { ControlGlyph } from "./ControlGlyph";

describe("IconButton", () => {
  it("uses aria-label as its accessible name", () => {
    render(
      <IconButton aria-label="Close">
        <ControlGlyph name="close" />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("defaults to the token variant", () => {
    render(
      <IconButton aria-label="Coins">
        <ControlGlyph name="close" />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Coins" })).toHaveAttribute(
      "data-variant",
      "token",
    );
  });

  it.each(["token", "ghost"] as const)("renders the %s variant", (variant) => {
    render(
      <IconButton variant={variant} aria-label="X">
        <ControlGlyph name="close" />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "X" })).toHaveAttribute(
      "data-variant",
      variant,
    );
  });

  it("fires onClick when pressed", async () => {
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Close" onClick={onClick}>
        <ControlGlyph name="close" />
      </IconButton>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Close" disabled onClick={onClick}>
        <ControlGlyph name="close" />
      </IconButton>,
    );
    const btn = screen.getByRole("button", { name: "Close" });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("exposes a toggle state via aria-pressed when pressed is provided", () => {
    const { rerender } = render(
      <IconButton aria-label="Sound effects" pressed>
        <ControlGlyph name="close" />
      </IconButton>,
    );
    expect(
      screen.getByRole("button", { name: "Sound effects" }),
    ).toHaveAttribute("aria-pressed", "true");

    rerender(
      <IconButton aria-label="Sound effects" pressed={false}>
        <ControlGlyph name="close" />
      </IconButton>,
    );
    expect(
      screen.getByRole("button", { name: "Sound effects" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("omits aria-pressed when it is not a toggle", () => {
    render(
      <IconButton aria-label="Close">
        <ControlGlyph name="close" />
      </IconButton>,
    );
    expect(
      screen.getByRole("button", { name: "Close" }),
    ).not.toHaveAttribute("aria-pressed");
  });
});
