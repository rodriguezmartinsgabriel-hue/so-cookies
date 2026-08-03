import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

describe("useFocusTrap", () => {
  it("returns a ref object", () => {
    const { result } = renderHook(() => useFocusTrap(false));
    expect(result.current).toBeDefined();
    expect(result.current).toHaveProperty("current");
    expect(result.current.current).toBeNull();
  });

  it("keeps ref stable across re-renders", () => {
    const { result, rerender } = renderHook(({ active }) => useFocusTrap(active), {
      initialProps: { active: false },
    });
    const ref = result.current;
    rerender({ active: false });
    expect(result.current).toBe(ref);
  });
});
