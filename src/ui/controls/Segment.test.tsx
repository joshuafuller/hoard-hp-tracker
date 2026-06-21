import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Segment } from "./Segment";

const OPTIONS = [
  { value: "dis", label: "Disadvantage" },
  { value: "normal", label: "Normal" },
  { value: "adv", label: "Advantage" },
] as const;

describe("Segment", () => {
  it("renders one button per option with its label as the accessible name", () => {
    render(
      <Segment
        options={OPTIONS}
        value="normal"
        onChange={vi.fn()}
        aria-label="Roll mode"
      />,
    );
    for (const opt of OPTIONS) {
      expect(
        screen.getByRole("button", { name: opt.label }),
      ).toBeInTheDocument();
    }
  });

  it("marks only the active segment as pressed", () => {
    render(<Segment options={OPTIONS} value="adv" onChange={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Advantage" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Normal" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByRole("button", { name: "Disadvantage" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onChange with the option value when a segment is pressed", async () => {
    const onChange = vi.fn();
    render(<Segment options={OPTIONS} value="normal" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Advantage" }));
    expect(onChange).toHaveBeenCalledWith("adv");
  });

  it("groups the segments under an accessible group label", () => {
    render(
      <Segment
        options={OPTIONS}
        value="normal"
        onChange={vi.fn()}
        aria-label="Roll mode"
      />,
    );
    expect(screen.getByRole("group", { name: "Roll mode" })).toBeInTheDocument();
  });

  it("disables all segments when disabled", async () => {
    const onChange = vi.fn();
    render(
      <Segment options={OPTIONS} value="normal" disabled onChange={onChange} />,
    );
    const adv = screen.getByRole("button", { name: "Advantage" });
    expect(adv).toBeDisabled();
    await userEvent.click(adv);
    expect(onChange).not.toHaveBeenCalled();
  });
});
