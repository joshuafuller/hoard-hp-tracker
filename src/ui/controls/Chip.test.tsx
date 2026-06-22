import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Chip } from "./Chip";

describe("Chip", () => {
  it("renders its label as an accessible name", () => {
    render(<Chip>d20</Chip>);
    expect(screen.getByRole("button", { name: "d20" })).toBeInTheDocument();
  });

  it("prefers an explicit aria-label over visible content", () => {
    render(<Chip aria-label="Add d20">d20</Chip>);
    expect(screen.getByRole("button", { name: "Add d20" })).toBeInTheDocument();
  });

  it("conveys selection via aria-pressed and a data attribute", () => {
    const { rerender } = render(<Chip selected>d20</Chip>);
    const chip = screen.getByRole("button", { name: "d20" });
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(chip).toHaveAttribute("data-selected", "true");

    rerender(<Chip selected={false}>d20</Chip>);
    expect(screen.getByRole("button", { name: "d20" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("omits aria-pressed when selected is not provided (plain readout)", () => {
    render(<Chip>3 gp</Chip>);
    expect(screen.getByRole("button", { name: "3 gp" })).not.toHaveAttribute(
      "aria-pressed",
    );
  });

  it("renders a count badge", () => {
    render(<Chip badge={2}>d6</Chip>);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows a remove affordance and fires onRemove", async () => {
    const onRemove = vi.fn();
    render(
      <Chip removable onRemove={onRemove}>
        d6
      </Chip>,
    );
    const remove = screen.getByRole("button", { name: "Remove d6" });
    await userEvent.click(remove);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("derives a specific remove name and is not polluted by an action aria-label", () => {
    render(
      <Chip removable onRemove={vi.fn()} aria-label="Add d6">
        d6
      </Chip>,
    );
    // The remove control reads "Remove d6" (from children), NOT "Remove Add d6".
    expect(
      screen.getByRole("button", { name: "Remove d6" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove Add d6" }),
    ).not.toBeInTheDocument();
  });

  it("honors an explicit removeLabel", () => {
    render(
      <Chip removable onRemove={vi.fn()} removeLabel="Remove gold">
        gp
      </Chip>,
    );
    expect(
      screen.getByRole("button", { name: "Remove gold" }),
    ).toBeInTheDocument();
  });

  it("does not render a dead remove button when onRemove is missing", () => {
    render(<Chip removable>d6</Chip>);
    // Only the chip itself is a button — no orphaned, do-nothing × control.
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(
      screen.queryByRole("button", { name: /^remove/i }),
    ).not.toBeInTheDocument();
  });

  it("disables the remove button when the chip is disabled", async () => {
    const onRemove = vi.fn();
    render(
      <Chip removable disabled onRemove={onRemove}>
        d6
      </Chip>,
    );
    const remove = screen.getByRole("button", { name: "Remove d6" });
    expect(remove).toBeDisabled();
    await userEvent.click(remove);
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("fires onClick when tapped", async () => {
    const onClick = vi.fn();
    render(<Chip onClick={onClick}>d20</Chip>);
    await userEvent.click(screen.getByRole("button", { name: "d20" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Chip disabled onClick={onClick}>
        d20
      </Chip>,
    );
    const chip = screen.getByRole("button", { name: "d20" });
    expect(chip).toBeDisabled();
    await userEvent.click(chip);
    expect(onClick).not.toHaveBeenCalled();
  });
});
