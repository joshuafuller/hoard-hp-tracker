import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Stepper } from "./Stepper";

describe("Stepper", () => {
  it("renders a decrement and increment control with accessible names", () => {
    render(<Stepper label="Modifier" value={0} onDec={vi.fn()} onInc={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Decrease Modifier" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Increase Modifier" }),
    ).toBeInTheDocument();
  });

  it("renders the value readout when provided", () => {
    render(<Stepper label="Modifier" value={3} onDec={vi.fn()} onInc={vi.fn()} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("formats the value via formatValue when given", () => {
    render(
      <Stepper
        label="Modifier"
        value={3}
        formatValue={(v) => `+${v}`}
        onDec={vi.fn()}
        onInc={vi.fn()}
      />,
    );
    expect(screen.getByText("+3")).toBeInTheDocument();
  });

  it("fires onDec / onInc when the buttons are pressed", async () => {
    const onDec = vi.fn();
    const onInc = vi.fn();
    render(<Stepper label="Modifier" value={0} onDec={onDec} onInc={onInc} />);
    await userEvent.click(screen.getByRole("button", { name: "Decrease Modifier" }));
    await userEvent.click(screen.getByRole("button", { name: "Increase Modifier" }));
    expect(onDec).toHaveBeenCalledTimes(1);
    expect(onInc).toHaveBeenCalledTimes(1);
  });

  it("disables both buttons when disabled", async () => {
    const onDec = vi.fn();
    const onInc = vi.fn();
    render(
      <Stepper label="Modifier" value={0} disabled onDec={onDec} onInc={onInc} />,
    );
    const dec = screen.getByRole("button", { name: "Decrease Modifier" });
    const inc = screen.getByRole("button", { name: "Increase Modifier" });
    expect(dec).toBeDisabled();
    expect(inc).toBeDisabled();
    await userEvent.click(dec);
    await userEvent.click(inc);
    expect(onDec).not.toHaveBeenCalled();
    expect(onInc).not.toHaveBeenCalled();
  });

  it("can disable only the decrement (e.g. at a minimum)", () => {
    render(
      <Stepper
        label="Coins"
        value={0}
        decDisabled
        onDec={vi.fn()}
        onInc={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Decrease Coins" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Increase Coins" }),
    ).not.toBeDisabled();
  });
});
