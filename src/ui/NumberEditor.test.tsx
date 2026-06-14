import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NumberEditor } from "./NumberEditor";

describe("NumberEditor", () => {
  it("renders the field label and current value", () => {
    render(<NumberEditor label="Current HP" value={23} onCommit={() => {}} />);
    const input = screen.getByRole("spinbutton", { name: /current hp/i });
    expect(input).toHaveValue(23);
  });

  it("commits the typed value on blur", async () => {
    const onCommit = vi.fn();
    render(<NumberEditor label="Max HP" value={40} onCommit={onCommit} />);
    const input = screen.getByRole("spinbutton", { name: /max hp/i });
    await userEvent.clear(input);
    await userEvent.type(input, "55");
    await userEvent.tab();
    expect(onCommit).toHaveBeenCalledWith(55);
  });

  it("commits the typed value when Enter is pressed", async () => {
    const onCommit = vi.fn();
    render(<NumberEditor label="Temp HP" value={0} onCommit={onCommit} />);
    const input = screen.getByRole("spinbutton", { name: /temp hp/i });
    await userEvent.clear(input);
    await userEvent.type(input, "12{Enter}");
    expect(onCommit).toHaveBeenCalledWith(12);
  });

  it("does not commit a blank or non-numeric entry", async () => {
    const onCommit = vi.fn();
    render(<NumberEditor label="Current HP" value={23} onCommit={onCommit} />);
    const input = screen.getByRole("spinbutton", { name: /current hp/i });
    await userEvent.clear(input);
    await userEvent.tab();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("interprets the full numeric value (not parseInt) and commits an integer", () => {
    const onCommit = vi.fn();
    render(<NumberEditor label="Current HP" value={23} onCommit={onCommit} />);
    const input = screen.getByRole("spinbutton", { name: /current hp/i });
    // `<input type=number>` can yield scientific notation; parseInt("1e2") === 1,
    // which would be a silent mis-parse. The full value is 100.
    fireEvent.change(input, { target: { value: "1e2" } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith(100);
  });

  it("truncates a decimal entry to an integer", () => {
    const onCommit = vi.fn();
    render(<NumberEditor label="Current HP" value={23} onCommit={onCommit} />);
    const input = screen.getByRole("spinbutton", { name: /current hp/i });
    fireEvent.change(input, { target: { value: "5.7" } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith(5);
  });
});
