import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConcentrationToggle } from "./ConcentrationToggle";

describe("ConcentrationToggle", () => {

  it("renders a button with accessible label", () => {
    render(<ConcentrationToggle concentrating={false} onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Concentration" })).toBeInTheDocument();
  });

  it("reflects off state via aria-pressed=false", () => {
    render(<ConcentrationToggle concentrating={false} onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Concentration" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reflects on state via aria-pressed=true", () => {
    render(<ConcentrationToggle concentrating={true} onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Concentration" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("calls onToggle when clicked", async () => {
    const onToggle = vi.fn();
    render(<ConcentrationToggle concentrating={false} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole("button", { name: "Concentration" }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("applies data-concentrating=true when on", () => {
    render(<ConcentrationToggle concentrating={true} onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Concentration" })).toHaveAttribute(
      "data-concentrating",
      "true",
    );
  });

  it("applies data-concentrating=false when off", () => {
    render(<ConcentrationToggle concentrating={false} onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Concentration" })).toHaveAttribute(
      "data-concentrating",
      "false",
    );
  });
});
