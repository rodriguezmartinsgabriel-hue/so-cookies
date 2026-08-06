import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "pricing/**/*.test.{ts,tsx}", "middleware.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.{ts,tsx}", "pricing/**/*.{ts,tsx}"],
      exclude: [
        "src/generated/**",
        "src/test/**",
        "**/*.test.{ts,tsx}",
        "**/*.config.{ts,js,mjs}",
        "**/*.d.ts",
        "src/app/**/layout.tsx",
        "src/app/**/page.tsx",
        "src/app/**/providers.tsx",
        "src/app/**/loading.tsx",
        "src/app/**/error.tsx",
      ],
      // Thresholds conservadores ajustados à base real (~43%).
      // TODO(fase-3-cobertura): subir gradualmente para 80% à medida que
      // testes forem adicionados a integrations/repository/sync-service/clients.
      thresholds: {
        lines: 40,
        functions: 40,
        branches: 35,
        statements: 40,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@so-cookies/pricing": path.resolve(__dirname, "./pricing"),
    },
  },
})
