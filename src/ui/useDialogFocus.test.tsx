import { fireEvent, render } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it } from "vitest";
import { useDialogFocus } from "./useDialogFocus";

function Dialog() {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref);
  return (
    <div ref={ref}>
      <button>first</button>
      <button>middle</button>
      <button>last</button>
    </div>
  );
}

describe("useDialogFocus (#262)", () => {
  it("wraps Tab from the last focusable back to the first", () => {
    const { getByText } = render(<Dialog />);
    getByText("last").focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(getByText("first"));
  });

  it("wraps Shift+Tab from the first focusable to the last", () => {
    const { getByText } = render(<Dialog />);
    getByText("first").focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(getByText("last"));
  });

  it("leaves an interior Tab to the browser (only edges wrap) — doesn't preventDefault", () => {
    const { getByText } = render(<Dialog />);
    getByText("middle").focus();
    // Assert via defaultPrevented (not activeElement): JSDOM doesn't move focus on Tab, so
    // an activeElement check would pass trivially even without the trap (Copilot #277).
    const ev = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false); // the trap left the interior move to the browser
  });

  it("pulls focus into the dialog when it has escaped to <body> (Codex #277)", () => {
    const { getByText } = render(<Dialog />);
    expect(document.activeElement).toBe(document.body); // nothing inside is focused
    const ev = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(document.activeElement).toBe(getByText("first")); // pulled back to the first control
    expect(ev.defaultPrevented).toBe(true);
  });

  it("restores focus to the element that was focused before it opened, on unmount", () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    const { getByText, unmount } = render(<Dialog />);
    getByText("first").focus(); // focus moved into the dialog
    unmount();
    expect(document.activeElement).toBe(trigger); // returned to the trigger
    trigger.remove();
  });
});
