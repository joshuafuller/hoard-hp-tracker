import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { HpValueEditor } from "./HpValueEditor";

const noop = () => {};

function renderEditor(props: Partial<ComponentProps<typeof HpValueEditor>> = {}) {
  return render(
    <HpValueEditor
      label="Max HP"
      value={32}
      onDecrement={noop}
      onIncrement={noop}
      onSet={noop}
      onClose={noop}
      {...props}
    />,
  );
}

describe("HpValueEditor", () => {
  it("renders a labelled modal dialog with the current value", () => {
    renderEditor();
    expect(screen.getByRole("dialog", { name: /set max hp/i })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: /max hp/i })).toHaveValue(32);
  });

  it("fires onDecrement / onIncrement from the pill ends", async () => {
    const onDecrement = vi.fn();
    const onIncrement = vi.fn();
    renderEditor({ onDecrement, onIncrement });
    await userEvent.click(screen.getByRole("button", { name: /decrease max hp/i }));
    await userEvent.click(screen.getByRole("button", { name: /increase max hp/i }));
    expect(onDecrement).toHaveBeenCalledTimes(1);
    expect(onIncrement).toHaveBeenCalledTimes(1);
  });

  it("commits a typed value via onSet (full value, integer)", () => {
    const onSet = vi.fn();
    renderEditor({ onSet });
    const input = screen.getByRole("spinbutton", { name: /max hp/i });
    fireEvent.change(input, { target: { value: "45" } });
    fireEvent.blur(input);
    expect(onSet).toHaveBeenCalledWith(45);
  });

  it("does not commit a blank entry", () => {
    const onSet = vi.fn();
    renderEditor({ onSet });
    const input = screen.getByRole("spinbutton", { name: /max hp/i });
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(onSet).not.toHaveBeenCalled();
  });

  it("traps Tab focus within the dialog", async () => {
    renderEditor();
    const minus = screen.getByRole("button", { name: /decrease max hp/i });
    const done = screen.getByRole("button", { name: /done/i });
    done.focus();
    await userEvent.tab();
    expect(minus).toHaveFocus();
  });

  it("closes via Done, backdrop, and Escape", async () => {
    const onClose = vi.fn();
    renderEditor({ onClose });
    await userEvent.click(screen.getByRole("button", { name: /done/i }));
    await userEvent.click(screen.getByTestId("hp-editor-backdrop"));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
