import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRole } from "@/hooks/useRole";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

import { useSession } from "next-auth/react";

function mockSession(user: { role?: string } | null) {
  const data = user ? { user } : null;
  (useSession as ReturnType<typeof vi.fn>).mockReturnValue({ data, status: user ? "authenticated" : "unauthenticated" });
}

describe("useRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("identifies admin user", () => {
    mockSession({ role: "ADMIN" });
    const { result } = renderHook(() => useRole());
    expect(result.current.role).toBe("ADMIN");
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.canEdit).toBe(true);
  });

  it("grants edit permission to non-viewer roles", () => {
    mockSession({ role: "GERENTE" });
    const { result } = renderHook(() => useRole());
    expect(result.current.role).toBe("GERENTE");
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.canEdit).toBe(true);
  });

  it("denies edit permission to VISUALIZADOR", () => {
    mockSession({ role: "VISUALIZADOR" });
    const { result } = renderHook(() => useRole());
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.canEdit).toBe(false);
  });

  it("returns empty role when session is null", () => {
    mockSession(null);
    const { result } = renderHook(() => useRole());
    expect(result.current.role).toBe("");
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.canEdit).toBe(true);
  });

  it("returns empty role when session.user has no role", () => {
    mockSession({});
    const { result } = renderHook(() => useRole());
    expect(result.current.role).toBe("");
    expect(result.current.isAdmin).toBe(false);
  });
});
