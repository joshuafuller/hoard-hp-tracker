import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HitDicePanel } from "./HitDicePanel";

const noop = () => {};

function renderPanel(
  props: Partial<React.ComponentProps<typeof HitDicePanel>> = {},
) {
  return render(
    <HitDicePanel
      size={8}
      total={5}
      available={3}
      conMod={2}
      onSetSize={noop}
      onSetTotal={noop}
      onSetAvailable={noop}
      onSetConMod={noop}
      {...props}
    />,
  );
}

/** The panel is collapsed by default; most tests need its body open first. */
async function expand() {
  await userEvent.click(
    screen.getByRole("button", { name: /hit dice/i }),
  );
}

describe("HitDicePanel", () => {
  // The readout splits its parts across <span>s for styling; match on the
  // textContent of the whole readout element, normalising whitespace.
  const readoutMatcher =
    (want: RegExp) => (_content: string, el: Element | null) =>
      el?.classList.contains("hit-dice__readout") === true &&
      want.test((el.textContent ?? "").replace(/\s+/g, " ").trim());

  it("is collapsed by default: the editors are not rendered", () => {
    renderPanel();
    expect(
      screen.queryByRole("combobox", { name: /hit die/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/hit dice total/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/available/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/con modifier/i)).not.toBeInTheDocument();
  });

  it("shows the readout while collapsed so it stays glanceable", () => {
    renderPanel({ size: 8, total: 5, available: 3 });
    expect(screen.getByText(readoutMatcher(/^3 ?\/ ?5 ?d8$/))).toBeInTheDocument();
  });

  it("marks the disclosure button collapsed, then expanded on toggle", async () => {
    renderPanel();
    const toggle = screen.getByRole("button", { name: /hit dice/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("reveals a plain-language explainer when expanded", async () => {
    renderPanel();
    expect(screen.queryByText(/short rest/i)).not.toBeInTheDocument();
    await expand();
    expect(screen.getByText(/short rest/i)).toBeInTheDocument();
  });

  it("shows the available / total dX readout in order", () => {
    renderPanel({ size: 8, total: 5, available: 3 });
    expect(screen.getByText(readoutMatcher(/^3 ?\/ ?5 ?d8$/))).toBeInTheDocument();
  });

  it("reflects a different size and pool in the readout", () => {
    renderPanel({ size: 12, total: 2, available: 0 });
    expect(screen.getByText(readoutMatcher(/^0 ?\/ ?2 ?d12$/))).toBeInTheDocument();
  });

  it("fires onSetSize with the numeric die size when the select changes", async () => {
    const onSetSize = vi.fn();
    renderPanel({ size: 8, onSetSize });
    await expand();
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /hit die/i }),
      "10",
    );
    expect(onSetSize).toHaveBeenCalledWith(10);
  });

  it("offers all four die sizes in the selector", async () => {
    renderPanel();
    await expand();
    const select = screen.getByRole("combobox", { name: /hit die/i });
    const values = Array.from(
      select.querySelectorAll("option"),
    ).map((o) => o.getAttribute("value"));
    expect(values).toEqual(["6", "8", "10", "12"]);
  });

  it("commits a new Total via the Total editor", async () => {
    const onSetTotal = vi.fn();
    renderPanel({ total: 5, onSetTotal });
    await expand();
    const input = screen.getByLabelText(/hit dice total/i);
    await userEvent.clear(input);
    await userEvent.type(input, "7");
    await userEvent.tab();
    expect(onSetTotal).toHaveBeenCalledWith(7);
  });

  it("commits a new Available via the Available editor", async () => {
    const onSetAvailable = vi.fn();
    renderPanel({ available: 3, onSetAvailable });
    await expand();
    const input = screen.getByLabelText(/available/i);
    await userEvent.clear(input);
    await userEvent.type(input, "1");
    await userEvent.tab();
    expect(onSetAvailable).toHaveBeenCalledWith(1);
  });

  it("commits a new CON modifier via the CON editor", async () => {
    const onSetConMod = vi.fn();
    renderPanel({ conMod: 2, onSetConMod });
    await expand();
    const input = screen.getByLabelText(/con modifier/i);
    await userEvent.clear(input);
    await userEvent.type(input, "-1");
    await userEvent.tab();
    expect(onSetConMod).toHaveBeenCalledWith(-1);
  });

  it("marks the open body as a modal dialog", async () => {
    renderPanel();
    await expand();
    const dialog = screen.getByRole("dialog", { name: /hit dice/i });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("closes on Escape", async () => {
    renderPanel();
    await expand();
    expect(screen.getByRole("dialog", { name: /hit dice/i })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: /hit dice/i })).not.toBeInTheDocument();
  });

  it("traps Tab focus within the open dialog (wraps last → first)", async () => {
    renderPanel();
    await expand();
    const dialog = screen.getByRole("dialog", { name: /hit dice/i });
    // The dialog contains the select + four NumberEditor controls; grab the
    // full ordered focusable set the trap will see.
    const all = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button, input, select, [tabindex]:not([tabindex="-1"])',
      ),
    );
    const first = all[0]!;
    const last = all[all.length - 1]!;
    expect(all.length).toBeGreaterThan(1);
    last.focus();
    await userEvent.tab();
    expect(first).toHaveFocus();
  });

  it("traps Shift+Tab focus within the open dialog (wraps first → last)", async () => {
    renderPanel();
    await expand();
    const dialog = screen.getByRole("dialog", { name: /hit dice/i });
    const all = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button, input, select, [tabindex]:not([tabindex="-1"])',
      ),
    );
    const first = all[0]!;
    const last = all[all.length - 1]!;
    first.focus();
    await userEvent.tab({ shift: true });
    expect(last).toHaveFocus();
  });
});
