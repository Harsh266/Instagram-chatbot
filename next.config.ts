import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully client-side demo: `next build` writes a static site to out/ (served by scripts/serve.mjs).
  output: "export",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
