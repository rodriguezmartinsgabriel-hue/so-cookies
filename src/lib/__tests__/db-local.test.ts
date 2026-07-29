import { describe, it, expect } from "vitest"

describe("db-local schema", () => {
  it("exports db instance", async () => {
    const mod = await import("@/lib/db-local")
    expect(mod.db).toBeDefined()
    expect(mod.db.name).toBe("SoManagerDB")
  })

  it("exports helper functions", async () => {
    const mod = await import("@/lib/db-local")
    expect(typeof mod.getLastSyncTime).toBe("function")
    expect(typeof mod.setLastSyncTime).toBe("function")
    expect(typeof mod.addToSyncQueue).toBe("function")
    expect(typeof mod.clearSyncQueue).toBe("function")
    expect(typeof mod.getPendingSyncCount).toBe("function")
  })
})
