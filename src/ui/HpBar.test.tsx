import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HpBar } from "./HpBar";

describe("HpBar tier mapping (ratio -> color)", () => {
  it("is healthy above half HP", () => {
    render(<HpBar current={30} max={40} temp={0} />);
    expect(screen.getByTestId("hp-bar")).toHaveAttribute("data-tier", "healthy");
  });

  it("is bloodied at exactly half HP", () => {
    render(<HpBar current={20} max={40} temp={0} />);
    expect(screen.getByTestId("hp-bar")).toHaveAttribute("data-tier", "bloodied");
  });

  it("is critical at exactly a quarter HP", () => {
    render(<HpBar current={10} max={40} temp={0} />);
    expect(screen.getByTestId("hp-bar")).toHaveAttribute("data-tier", "critical");
  });

  it("is down at zero HP", () => {
    render(<HpBar current={0} max={40} temp={0} />);
    expect(screen.getByTestId("hp-bar")).toHaveAttribute("data-tier", "down");
  });
});

describe("HpBar fill geometry", () => {
  it("fills proportionally to current/max", () => {
    render(<HpBar current={10} max={40} temp={0} />);
    expect(screen.getByTestId("hp-bar-fill")).toHaveStyle({ width: "25%" });
  });

  it("renders no overshield segment when temp is 0", () => {
    render(<HpBar current={20} max={40} temp={0} />);
    expect(screen.queryByTestId("hp-overshield")).not.toBeInTheDocument();
  });

  it("renders a distinct overshield segment when temp > 0", () => {
    render(<HpBar current={20} max={40} temp={10} />);
    const overshield = screen.getByTestId("hp-overshield");
    expect(overshield).toBeInTheDocument();
    expect(overshield).toHaveStyle({ width: "25%" });
  });

  it("clamps the overshield width so temp never overflows the track", () => {
    render(<HpBar current={40} max={40} temp={80} />);
    expect(screen.getByTestId("hp-overshield")).toHaveStyle({ width: "100%" });
  });
});
