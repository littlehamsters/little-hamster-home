# Smoke tests

Headless (Playwright) checks that the app boots and every module renders
without JS errors — the safety net for the modular refactor.

The app always runs on **port 8090** (dev and preview both — see
`vite.config.js`, `strictPort`). The smoke tests default to
`http://localhost:8090/`.

## Run

```bash
# 1. start the server in one terminal (always :8090)
npm run dev                 # http://localhost:8090

# 2. in another terminal
npm run test:smoke
```

To test the production bundle instead:

```bash
npm run build && npm run preview   # also :8090
npm run test:smoke
```

Override the target with `SMOKE_URL` if ever needed:
`SMOKE_URL=http://localhost:8090/ npm run test:smoke`.

## What they check

- **smoke.mjs** — critical functions exposed on `window` (nav + cross-module
  glue), Firebase login screen renders, every module switches via
  `showModule()` without throwing.
- **smoke-render.mjs** — seeds sample data and confirms the render pipelines
  populate the DOM (mortgage table, savings jars, budget, salary, dashboard).
- **smoke-backup.mjs** — `SYNC_KEYS` completeness, backup v2 format, and
  restore of both v2 (new) and v1 (legacy) files.
