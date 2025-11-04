import { defineConfig } from "vite"

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": "/convex",
    },
  },
})