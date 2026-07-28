# Smoke tests

Headless (Playwright) checks that the app boots and every module renders
without JS errors — the safety net for the modular refactor.

## Run

```bash
# 1. start a server in one terminal
npm run dev                 # http://localhost:5173

# 2. in another terminal, point the tests at it
SMOKE_URL=http://localhost:5173/ npm run test:smoke
```

Default URL is `http://localhost:5173/` (dev). To test the production
bundle instead:

```bash
npm run build && npm run preview   # e.g. http://localhost:4173
SMOKE_URL=http://localhost:4173/ npm run test:smoke
```

## What they check

- **smoke.mjs** — critical functions exposed on `window` (nav + cross-module
  glue), Firebase login screen renders, every module switches via
  `showModule()` without throwing.
- **smoke-render.mjs** — seeds sample data and confirms the render pipelines
  populate the DOM (mortgage table, savings jars, budget, salary, dashboard).
