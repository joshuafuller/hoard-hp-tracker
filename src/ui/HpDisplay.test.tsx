import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HpDisplay } from "./HpDisplay";

describe("HpDisplay", () => {
  it("shows the current HP prominently", () => {
    render(<HpDisplay current={23} max={40} temp={0} />);
    expect(screen.getByTestId("hp-current")).toHaveTextContent("23");
  });

  it("shows max HP beneath the current value", () => {
    render(<HpDisplay current={23} max={40} temp={0} />);
    expect(screen.getByTestId("hp-max")).toHaveTextContent("40");
  });

  it("renders a +temp badge when temp > 0", () => {
    render(<HpDisplay current={10} max={40} temp={7} />);
    expect(screen.getByTestId("hp-temp-badge")).toHaveTextContent("7");
  });

  it("omits the +temp badge when temp is 0", () => {
    render(<HpDisplay current={10} max={40} temp={0} />);
    expect(screen.queryByTestId("hp-temp-badge")).not.toBeInTheDocument();
  });

  it("exposes an accessible label summarising HP state", () => {
    render(<HpDisplay current={10} max={40} temp={5} />);
    expect(
      screen.getByRole("status", { name: /10.*40.*5 temporary/i }),
    ).toBeInTheDocument();
  });

  it("flags a damage flash when current decreases", () => {
    const { rerender } = render(<HpDisplay current={30} max={40} temp={0} />);
    rerender(<HpDisplay current={22} max={40} temp={0} />);
    expect(screen.getByTestId("hp-display")).toHaveAttribute("data-flash", "damage");
  });

  it("flags a damage flash when only temp HP absorbs the hit", () => {
    const { rerender } = render(<HpDisplay current={30} max={40} temp={10} />);
    rerender(<HpDisplay current={30} max={40} temp={4} />);
    expect(screen.getByTestId("hp-display")).toHaveAttribute("data-flash", "damage");
  });

  it("flags a heal flash when current increases", () => {
    const { rerender } = render(<HpDisplay current={22} max={40} temp={0} />);
    rerender(<HpDisplay current={30} max={40} temp={0} />);
    expect(screen.getByTestId("hp-display")).toHaveAttribute("data-flash", "heal");
  });

  it("has no flash on initial render", () => {
    render(<HpDisplay current={30} max={40} temp={0} />);
    expect(screen.getByTestId("hp-display")).not.toHaveAttribute("data-flash");
  });

  it("carries its own HP tier so the luminous number recolors independently", () => {
    const { rerender } = render(<HpDisplay current={30} max={40} temp={0} />);
    expect(screen.getByTestId("hp-display")).toHaveAttribute("data-tier", "healthy");
    rerender(<HpDisplay current={4} max={40} temp={0} />);
    expect(screen.getByTestId("hp-display")).toHaveAttribute("data-tier", "critical");
  });

  it("values are plain text (not buttons) without edit callbacks", () => {
    render(<HpDisplay current={23} max={40} temp={0} />);
    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
  });

  it("keeps Temp tappable even at 0 when editable (so temp can be added)", async () => {
    const onEditTemp = vi.fn();
    render(<HpDisplay current={10} max={40} temp={0} onEditTemp={onEditTemp} />);
    await userEvent.click(screen.getByRole("button", { name: /edit temporary hp/i }));
    expect(onEditTemp).toHaveBeenCalledTimes(1);
  });

  it("values become edit buttons when edit callbacks are provided", async () => {
    const onEditMax = vi.fn();
    const onEditCurrent = vi.fn();
    render(
      <HpDisplay
        current={23}
        max={40}
        temp={0}
        onEditCurrent={onEditCurrent}
        onEditMax={onEditMax}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /edit maximum hp/i }));
    expect(onEditMax).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: /edit current hp/i }));
    expect(onEditCurrent).toHaveBeenCalledTimes(1);
  });
});
