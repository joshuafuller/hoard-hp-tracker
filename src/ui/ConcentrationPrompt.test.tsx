import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConcentrationPrompt } from "./ConcentrationPrompt";

describe("ConcentrationPrompt", () => {
  it("renders the DC in the label", () => {
    render(
      <ConcentrationPrompt dc={14} onDismiss={vi.fn()} onDrop={vi.fn()} />,
    );
    expect(screen.getByText(/DC 14/i)).toBeInTheDocument();
  });

  it("renders a dismiss button", () => {
    render(
      <ConcentrationPrompt dc={10} onDismiss={vi.fn()} onDrop={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /keep/i })).toBeInTheDocument();
  });

  it("renders a drop button", () => {
    render(
      <ConcentrationPrompt dc={10} onDismiss={vi.fn()} onDrop={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /drop/i })).toBeInTheDocument();
  });

  it("calls onDismiss when Keep is clicked", async () => {
    const onDismiss = vi.fn();
    render(
      <ConcentrationPrompt dc={10} onDismiss={onDismiss} onDrop={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /keep/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("calls onDrop when Drop is clicked", async () => {
    const onDrop = vi.fn();
    render(
      <ConcentrationPrompt dc={10} onDismiss={vi.fn()} onDrop={onDrop} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /drop/i }));
    expect(onDrop).toHaveBeenCalledOnce();
  });

  it("has role=status for accessibility", () => {
    render(
      <ConcentrationPrompt dc={10} onDismiss={vi.fn()} onDrop={vi.fn()} />,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
