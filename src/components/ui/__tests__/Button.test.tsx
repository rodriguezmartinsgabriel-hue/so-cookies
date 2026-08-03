import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders with default variant (primary) and size (md)", () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: "Click me" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-ink", "text-paper");
  });

  it("applies variant classes correctly", () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("bg-danger", "text-paper");
  });

  it("applies size classes correctly", () => {
    const { rerender } = render(<Button size="sm">A</Button>);
    expect(screen.getByRole("button", { name: "A" })).toHaveClass("h-9");
    rerender(<Button size="lg">A</Button>);
    expect(screen.getByRole("button", { name: "A" })).toHaveClass("h-12");
  });

  it("defaults to type=button (not submit) to prevent accidental form submits", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "button");
  });

  it("honors explicit type=submit", () => {
    render(<Button type="submit">Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "submit");
  });

  it("renders disabled state and ignores clicks", async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("fires onClick handler when clicked", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Click" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("forwards ref to underlying button element", () => {
    let ref: HTMLButtonElement | null = null;
    render(<Button ref={(el) => { ref = el; }}>Ref test</Button>);
    expect(ref).not.toBeNull();
    expect((ref as HTMLButtonElement | null)?.tagName).toBe("BUTTON");
  });

  it("accepts custom className merged with defaults", () => {
    render(<Button className="my-custom">X</Button>);
    const button = screen.getByRole("button", { name: "X" });
    expect(button).toHaveClass("my-custom");
    expect(button).toHaveClass("bg-ink");
  });

  it("icon size variant renders square button", () => {
    render(<Button size="icon" aria-label="icon">★</Button>);
    expect(screen.getByRole("button", { name: "icon" })).toHaveClass("w-10", "h-10");
  });

  it("forwards extra HTML attributes (aria-label, data-testid)", () => {
    render(<Button aria-label="Save item" data-testid="save-btn" />);
    expect(screen.getByTestId("save-btn")).toHaveAttribute("aria-label", "Save item");
  });
});
