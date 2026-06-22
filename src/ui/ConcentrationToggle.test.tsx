import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConcentrationToggle } from "./ConcentrationToggle";
import { playSfx } from "../sound/sfx";

vi.mock("../sound/sfx", () => ({ playSfx: vi.fn() }));

describe("ConcentrationToggle", () => {
  it("plays a cue only when concentration ACTUALLY changes, not on a rejected tap (#90/#145)", async () => {
    vi.mocked(playSfx).mockClear();
    const onToggle = vi.fn();
    const { rerender } = render(<ConcentrationToggle concentrating={false} onToggle={onToggle} />);
    // A tap whose state change is rejected (e.g. downed → setConcentrating(true) no-ops)
    // leaves the prop unchanged → NO cue, even though onToggle fired.
    await userEvent.click(screen.getByRole("button", { name: "Concentration" }));
    expect(onToggle).toHaveBeenCalled();
    expect(playSfx).not.toHaveBeenCalled();
    // A real transition false→true fires toggle-on; true→false fires toggle-off.
    rerender(<ConcentrationToggle concentrating onToggle={onToggle} />);
    expect(playSfx).toHaveBeenLastCalledWith("toggleOn");
    rerender(<ConcentrationToggle concentrating={false} onToggle={onToggle} />);
    expect(playSfx).toHaveBeenLastCalledWith("toggleOff");
  });

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
