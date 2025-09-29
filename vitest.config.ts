import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: "./convex/test/globalSetup.ts",
    reporters: [
      [
        'default',
        {
          summary: false,
        },
      ],
    ],
  },
});