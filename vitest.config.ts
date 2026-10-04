import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
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
