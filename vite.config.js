import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static SPA build. Output goes to dist/ and can be served by any static host
// (Vercel, Cloudflare Pages, Netlify, GitHub Pages, Hugging Face Spaces).
//
// `base` is "/" for root-hosted deploys. For a GitHub Pages *project* site
// (served from https://<user>.github.io/<repo>/) set base to "/<repo>/" — the
// deploy workflow passes this via the VITE_BASE env var.
export default defineConfig({
  base: process.env.VITE_BASE || "/",
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: true,
    target: "es2020",
  },
});
