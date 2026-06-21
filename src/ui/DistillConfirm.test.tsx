import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DistillConfirm } from "./DistillConfirm";

function setup(over = {}) {
  const props = {
    coins: { pp: 2, gp: 41, sp: 12, cp: 30 },
    onConfirm: vi.fn(),
    onClose: vi.fn(),
    ...over,
  };
  render(<DistillConfirm {...props} />);
  return props;
}

describe("DistillConfirm", () => {
  it("shows each denomination's before→after and an unchanged total", () => {
    setup();
    const dialog = screen.getByRole("dialog", { name: /distill coins/i });
    // 2pp 41gp 12sp 30cp = 6250 cp ⇒ 6pp 2gp 5sp 0cp; total 62.5 gp, unchanged.
    expect(dialog).toHaveTextContent("62.5 gp");
    expect(dialog).toHaveTextContent(/unchanged/i);
    // The platinum row goes 2 → 6.
    const ppRow = dialog.querySelector('[data-kind="pp"]')!;
    expect(within(ppRow as HTMLElement).getByText("2")).toBeInTheDocument();
    expect(within(ppRow as HTMLElement).getByText("6")).toBeInTheDocument();
  });

  it("confirms and then closes when Distill is pressed", async () => {
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: /^distill$/i }));
    expect(p.onConfirm).toHaveBeenCalledTimes(1);
    expect(p.onClose).toHaveBeenCalledTimes(1);
  });

  it("closes without confirming on Cancel, backdrop, or Escape", async () => {
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await userEvent.click(screen.getByTestId("distill-backdrop"));
    await userEvent.keyboard("{Escape}");
    expect(p.onConfirm).not.toHaveBeenCalled();
    expect(p.onClose).toHaveBeenCalledTimes(3);
  });

  it("traps Tab focus within the dialog (wraps last → first)", async () => {
    setup();
    const dialog = screen.getByRole("dialog", { name: /distill coins/i });
    const all = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button, input, [tabindex]:not([tabindex="-1"])',
      ),
    );
    const first = all[0]!;
    const last = all[all.length - 1]!;
    last.focus();
    await userEvent.tab();
    expect(first).toHaveFocus();
  });

  it("traps Shift+Tab focus within the dialog (wraps first → last)", async () => {
    setup();
    const dialog = screen.getByRole("dialog", { name: /distill coins/i });
    const all = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button, input, [tabindex]:not([tabindex="-1"])',
      ),
    );
    const first = all[0]!;
    const last = all[all.length - 1]!;
    first.focus();
    await userEvent.tab({ shift: true });
    expect(last).toHaveFocus();
  });
});
