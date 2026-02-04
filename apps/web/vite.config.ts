import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
  css: {
    postcss: {
      plugins: [
        tailwindcss(path.resolve(__dirname, "./tailwind.config.cjs")),
        autoprefixer(),
      ],
    },
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../packages"),
      "@assets": path.resolve(__dirname, "./src/assets"),
    },
  },
});
