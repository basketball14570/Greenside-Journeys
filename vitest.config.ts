import { defineConfig } from "vitest/config";
import path from "node:path";

// Vitest config — minimal node-environment setup for testing pure
// library code (grading math, parsers, encoders). React components
// aren't tested here; they're covered by build-time type checks and
// in-browser exercising.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "lib/**/*.test.tsx"],
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
