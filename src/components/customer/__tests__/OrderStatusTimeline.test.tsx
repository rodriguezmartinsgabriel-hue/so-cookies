import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrderStatusTimeline } from "@/components/customer/OrderStatusTimeline";

describe("OrderStatusTimeline", () => {
  it("renders all status labels in order", () => {
    render(<OrderStatusTimeline status="PENDENTE" />);
    expect(screen.getByText("Recebido")).toBeInTheDocument();
    expect(screen.getByText("Confirmado")).toBeInTheDocument();
    expect(screen.getByText("Em produção")).toBeInTheDocument();
    expect(screen.getByText("Pronto para retirar")).toBeInTheDocument();
    expect(screen.getByText("Em entrega")).toBeInTheDocument();
    expect(screen.getByText("Finalizado")).toBeInTheDocument();
  });

  it("shows a check for done steps and a clock for the current step", () => {
    const { container } = render(<OrderStatusTimeline status="PRODUCAO" />);
    expect(container.querySelectorAll(".lucide-check").length).toBe(2);
    expect(container.querySelectorAll(".lucide-clock").length).toBe(1);
  });

  it("shows a check on the final step when status is CONCLUIDO", () => {
    const { container } = render(<OrderStatusTimeline status="CONCLUIDO" />);
    expect(container.querySelectorAll(".lucide-check").length).toBe(6);
    expect(container.querySelectorAll(".lucide-clock").length).toBe(0);
  });

  it("renders nothing for an unknown status", () => {
    const { container } = render(<OrderStatusTimeline status="CANCELADO" />);
    expect(container.innerHTML).toBe("");
  });
});
