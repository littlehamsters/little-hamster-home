# Modular refactor

The app used to be one 4,700-line `index.html`. It is now a small Vite
project so new modules can be added without editing a monolith.

## Layout

```
index.html            shell: nav, Firebase login, home grid, module templates
src/
  main.js             entry — imports registry → firebase → app shell
  core/
    firebase.js       Google auth + Firestore sync (SYNC_KEYS from registry)
    app.js            registry-driven nav, home dashboard, backup/restore
  modules/
    registry.js       auto-discovers modules via import.meta.glob
    mortgage/  savings/  budget/  salary/
      index.js        module descriptor (metadata + lifecycle hooks)
      <engine>.js     the screen's logic (unchanged from the monolith)
  styles/*.css        one file per module, linked from <head>
test/                 Playwright smoke tests (npm run test:smoke)
```

## Commands

```bash
npm run dev            # dev server @ http://localhost:5173
npm run build          # production bundle → dist/
npm run preview        # serve the built bundle
SMOKE_URL=http://localhost:5173/ npm run test:smoke
```

## How modules connect

Each module talks to the rest of the app **only through `localStorage`**.
Firebase intercepts writes and syncs them; the home dashboard reads them.
The registry is the single source of truth — a descriptor declares which
`localStorage` keys it owns and what to run on open / remote-sync / home:

```js
// src/modules/<id>/index.js
import './engine.js';                 // exposes its window.* functions
export default {
  id: 'mynew', name: 'ชื่อ', icon: '📦', order: 5,
  storageKeys: ['mynew_v1'],          // → auto-added to sync + backup
  firstShow() { /* run once on first open */ },
  show()      { /* run every open */ },
  onRemote()  { /* refresh after a cloud pull */ },
  dashboard() { /* update this module's home card */ },
};
```

`registry.js` picks it up automatically (glob) — no edits to core files.

## Adding a new module today

1. `src/modules/<id>/` — add `engine.js` + `index.js` (descriptor above).
2. `src/styles/<id>.css` — add and `<link>` it in `index.html <head>`.
3. `index.html` — add the `<div id="m-<id>" class="m-app">…</div>` screen
   template and a card in `.home-grid` (`onclick="showModule('<id>')"`).

Wiring (sync keys, backup, nav dispatch, dashboard) is automatic.

## Done

- **Phase 0** Vite scaffold, app served unchanged.
- **Phase 1** CSS split into `src/styles/` (byte-identical).
- **Phase 2** JS split into ES modules under `src/` (byte-identical); global
  scope preserved by re-exposing each engine's functions to `window` so the
  inline `onclick=` handlers keep working.
- **Phase 3** Module registry + registry-driven core (nav, dashboard,
  `SYNC_KEYS`, backup/restore). Backup now writes a generic v2 format and
  still restores old v1 files.

## Phase 4 — optional, not done yet

Fully self-contained modules so adding one is *only* step 1 above:

- Move each module's screen template + home card out of `index.html` into
  its descriptor (e.g. `template` / `card` strings the shell injects).
- Have each descriptor `import './style.css'` instead of an `index.html`
  `<link>`.
- Replace inline `onclick=` handlers with `addEventListener` inside each
  module, dropping the `window.*` exposure shims.

These touch the large HTML templates, so verify visually in a browser (the
headless smoke tests don't check layout).
