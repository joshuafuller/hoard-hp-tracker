import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CharacterName } from "./CharacterName";

describe("CharacterName", () => {
  it("shows a visible 'name your character' affordance when empty — not a blank gap (#163)", () => {
    const { container } = render(<CharacterName name="" onSetName={vi.fn()} />);
    expect(container.querySelector(".character-name__display")).toBeInTheDocument();
    // The empty slot now visibly invites naming (text + a cue), so a new user knows to tap.
    const btn = screen.getByRole("button", { name: /name your character/i });
    expect(btn).toHaveTextContent(/name your character/i);
    expect(btn.querySelector("svg")).toBeTruthy(); // a subtle pencil cue
  });

  it("renders the placeholder affordance when name is blank", () => {
    render(<CharacterName name="" onSetName={vi.fn()} />);
    // The placeholder is visible to assistive tech / visually (aria-label or placeholder).
    const btn = screen.getByRole("button", { name: /name your character/i });
    expect(btn).toBeInTheDocument();
  });

  it("renders the character name when set", () => {
    render(<CharacterName name="Aria Nighthollow" onSetName={vi.fn()} />);
    expect(screen.getByText("Aria Nighthollow")).toBeInTheDocument();
  });

  it("tapping the name enters edit mode and shows an input", async () => {
    render(<CharacterName name="Gandalf" onSetName={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /edit name/i }));
    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("Gandalf");
  });

  it("tapping the placeholder enters edit mode with an empty input", async () => {
    render(<CharacterName name="" onSetName={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /name your character/i }));
    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("committing a typed name calls onSetName with the value", async () => {
    const onSetName = vi.fn();
    render(<CharacterName name="" onSetName={onSetName} />);
    await userEvent.click(screen.getByRole("button", { name: /name your character/i }));
    await userEvent.type(screen.getByRole("textbox"), "Thorn");
    await userEvent.keyboard("{Enter}");
    expect(onSetName).toHaveBeenCalledWith("Thorn");
  });

  it("blurring the input commits the value", async () => {
    const onSetName = vi.fn();
    render(<CharacterName name="" onSetName={onSetName} />);
    await userEvent.click(screen.getByRole("button", { name: /name your character/i }));
    await userEvent.type(screen.getByRole("textbox"), "Luna");
    // Tab away to blur
    await userEvent.tab();
    expect(onSetName).toHaveBeenCalledWith("Luna");
  });

  it("keeps showing a just-committed name even if the store hasn't echoed it back (iOS liveQuery lag)", async () => {
    // Repro: on iOS Safari the IndexedDB liveQuery can lag/miss the write, so the `name`
    // prop stays "" after a commit — which made the name appear to vanish. The committed
    // value must stay visible optimistically until the store catches up.
    const onSetName = vi.fn(); // parent does NOT update `name` (simulates the lagging echo)
    render(<CharacterName name="" onSetName={onSetName} />);
    await userEvent.click(screen.getByRole("button", { name: /name your character/i }));
    await userEvent.type(screen.getByRole("textbox"), "Thorn");
    await userEvent.keyboard("{Enter}");
    expect(onSetName).toHaveBeenCalledWith("Thorn");
    expect(screen.getByText("Thorn")).toBeInTheDocument(); // does NOT disappear
    expect(screen.queryByRole("button", { name: /name your character/i })).toBeNull();
  });

  it("pressing Escape dismisses the editor without calling onSetName", async () => {
    const onSetName = vi.fn();
    render(<CharacterName name="Kira" onSetName={onSetName} />);
    await userEvent.click(screen.getByRole("button", { name: /edit name/i }));
    await userEvent.keyboard("{Escape}");
    expect(onSetName).not.toHaveBeenCalled();
    // Back to display mode
    expect(screen.getByRole("button", { name: /edit name/i })).toBeInTheDocument();
  });

  it("enforces a maxlength of 24 on the input element", async () => {
    render(<CharacterName name="" onSetName={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /name your character/i }));
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("maxlength", "24");
  });
});
