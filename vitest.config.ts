import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}", "tests/**/*.spec.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["./tests/setupGlobals.ts", "./tests/setupTests.ts"],
    globals: true,
    exclude: [
      "**/.worktrees/**",
      "**/dist/**",
      "**/target/**",
      "**/node_modules/**",
    ],
    coverage: {
      reporter: ["text", "lcov"],
    },
  },
});
