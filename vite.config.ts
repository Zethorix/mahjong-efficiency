import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base "./" makes the build relocatable so it works on GitHub Pages
// project sites (https://<user>.github.io/<repo>/) without configuration.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
});
