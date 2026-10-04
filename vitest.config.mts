import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      // `server-only` throws outside React Server Components; it's a no-op under test.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    // Integration tests share one Postgres database, so run files sequentially.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
