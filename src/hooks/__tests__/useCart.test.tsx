import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCart } from "@/hooks/useCart";

beforeEach(() => {
  localStorage.clear();
});

describe("useCart", () => {
  it("starts with empty cart", () => {
    const { result } = renderHook(() => useCart());
    expect(result.current.items).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it("loads persisted cart from localStorage", () => {
    localStorage.setItem("socookie_cart", JSON.stringify([{ productId: "p1", qty: 3 }]));
    const { result } = renderHook(() => useCart());
    expect(result.current.items).toEqual([{ productId: "p1", qty: 3 }]);
    expect(result.current.count).toBe(3);
  });

  it("addItem adds new product", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addItem("p1", 2));
    expect(result.current.items).toEqual([{ productId: "p1", qty: 2 }]);
    expect(result.current.count).toBe(2);
  });

  it("addItem increments qty when product already in cart", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addItem("p1", 2));
    act(() => result.current.addItem("p1", 1));
    expect(result.current.items).toEqual([{ productId: "p1", qty: 3 }]);
    expect(result.current.count).toBe(3);
  });

  it("setQty updates existing item", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addItem("p1", 2));
    act(() => result.current.setQty("p1", 5));
    expect(result.current.items).toEqual([{ productId: "p1", qty: 5 }]);
  });

  it("setQty removes item when qty <= 0", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addItem("p1", 2));
    act(() => result.current.setQty("p1", 0));
    expect(result.current.items).toEqual([]);
  });

  it("removeItem removes the right product", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addItem("p1", 1));
    act(() => result.current.addItem("p2", 2));
    act(() => result.current.removeItem("p1"));
    expect(result.current.items).toEqual([{ productId: "p2", qty: 2 }]);
  });

  it("clear empties the cart", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addItem("p1", 1));
    act(() => result.current.clear());
    expect(result.current.items).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it("persists items to localStorage on every mutation", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addItem("p1", 2));
    expect(JSON.parse(localStorage.getItem("socookie_cart") || "[]")).toEqual([{ productId: "p1", qty: 2 }]);
    act(() => result.current.setQty("p1", 5));
    expect(JSON.parse(localStorage.getItem("socookie_cart") || "[]")).toEqual([{ productId: "p1", qty: 5 }]);
    act(() => result.current.clear());
    expect(JSON.parse(localStorage.getItem("socookie_cart") || "[]")).toEqual([]);
  });

  it("handles corrupted localStorage gracefully", () => {
    localStorage.setItem("socookie_cart", "{not valid json}");
    const { result } = renderHook(() => useCart());
    expect(result.current.items).toEqual([]);
  });
});
