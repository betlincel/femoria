import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: projectRoot,
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: { alias: { "@": projectRoot } },
});
