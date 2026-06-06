import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static SPA build. Output goes to dist/ and can be served by any static host
// (Vercel, Cloudflare Pages, Netlify, GitHub Pages, Hugging Face Spaces).
//
// `base` is "/" for root-hosted deploys. For a GitHub Pages *project* site
// (served from https://<user>.github.io/<repo>/) set base to "/<repo>/" — the
// deploy workflow passes this via the VITE_BASE env var.
// Normalize base to always start and end with a single "/".
// On GitHub Pages, the deploy workflow passes the repo path (e.g. "/geo-landing")
// via VITE_BASE; with a custom domain it passes "" → resolves to "/".
let base = process.env.VITE_BASE || "/";
if (!base.startsWith("/")) base = "/" + base;
if (!base.endsWith("/")) base += "/";

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: true,
    target: "es2020",
  },
});
