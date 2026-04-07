import { defineConfig } from "vite";

export default defineConfig({
  root: "client",
  build: {
    outDir: "../dist/client",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
