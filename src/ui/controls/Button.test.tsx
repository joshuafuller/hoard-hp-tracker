import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders its label as an accessible name", () => {
    render(<Button>Throw</Button>);
    expect(screen.getByRole("button", { name: "Throw" })).toBeInTheDocument();
  });

  it("defaults to the primary variant and md size", () => {
    render(<Button>Apply</Button>);
    const btn = screen.getByRole("button", { name: "Apply" });
    expect(btn).toHaveAttribute("data-variant", "primary");
    expect(btn).toHaveAttribute("data-size", "md");
  });

  it.each(["primary", "ghost", "heal", "danger"] as const)(
    "renders the %s variant",
    (variant) => {
      render(<Button variant={variant}>Go</Button>);
      expect(screen.getByRole("button", { name: "Go" })).toHaveAttribute(
        "data-variant",
        variant,
      );
    },
  );

  it.each(["lg", "md", "sm"] as const)("renders the %s size", (size) => {
    render(<Button size={size}>Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveAttribute(
      "data-size",
      size,
    );
  });

  it("fires onClick when pressed", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Throw</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Throw" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Throw
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Throw" });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is a type=button by default so it never submits a form", () => {
    render(<Button>Throw</Button>);
    expect(screen.getByRole("button", { name: "Throw" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it("merges an extra className", () => {
    render(<Button className="dice-throw">Throw</Button>);
    expect(screen.getByRole("button", { name: "Throw" })).toHaveClass(
      "ctl-btn",
      "dice-throw",
    );
  });
});
