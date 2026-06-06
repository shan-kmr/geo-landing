# Janus / Geo — landing page

> The personalization layer for the real world. A high-craft single-page
> marketing site (React + Vite), deployed to GitHub Pages.

**Live:** https://shan-kmr.github.io/geo-landing/ <!-- updated automatically on deploy -->

## Stack

- **React 18** (production build)
- **Vite** — bundling, minification, hot-module-reload dev server
- Plain CSS with design tokens (`src/tokens.css` + `src/page.css`)
- No backend — fully static; the demo widget uses canned responses

## Develop

```bash
npm install        # once
npm run dev        # http://localhost:5173  — instant hot reload
```

Edit `src/app.jsx` (page), `src/demo-widget.jsx` (the live API demo),
`src/tweaks-panel.jsx` (design-time controls), or the CSS — the browser updates
as you type.

## Build / preview production

```bash
npm run build      # → dist/  (minified, hashed assets)
npm run preview    # serve the production build at http://localhost:4173
```

## Project structure

```
index.html              # Vite entry (fonts, meta, #root)
src/
  app.jsx               # page composition + entry (mounts <App/>)
  demo-widget.jsx       # interactive GeoContext API demo (currently unmounted)
  tweaks-panel.jsx      # floating design controls (hidden unless host-activated)
  tokens.css            # design tokens (colors, type, spacing)
  page.css              # page styles
public/
  favicon.svg           # hexagon brand mark
scripts/shot.mjs        # dev-only screenshot/parity helper (puppeteer-core)
reference/              # original design-tool artifacts — NOT deployed
.github/workflows/      # CI: build + deploy to GitHub Pages on every push to main
```

## Deploy

Every push to `main` triggers `.github/workflows/deploy.yml`, which builds with
Vite and publishes `dist/` to GitHub Pages. No manual steps.

### Custom domain (later)

1. Add a `public/CNAME` file containing the domain (e.g. `geo.example.com`).
2. Point DNS: a `CNAME` record for the subdomain → `shan-kmr.github.io`
   (or four `A` records to GitHub's apex IPs for a root domain).
3. The build's base path auto-switches to `/` once the domain is attached.

## Notes

- `src/demo-widget.jsx` is a complete interactive demo that isn't currently
  mounted (the original `App` doesn't render `<TryIt/>`). To enable it, add
  `<TryIt />` to `App`'s render tree in `src/app.jsx`.
- The Tweaks panel only appears when an editing host posts `__activate_edit_mode`;
  in production it stays hidden and inert.
