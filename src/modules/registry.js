/* ═══════════════════════════════════════════════════════════════════
   Module registry — single source of truth for all sub-apps.

   Adding a module: drop a folder under src/modules/<id>/ containing an
   index.js that `export default`s a descriptor (see mortgage/index.js).
   Vite's glob below auto-discovers it — no edits needed here or in the
   core. (Home card + screen template still live in index.html for now;
   see MIGRATION.md "Phase 4".)

   Descriptor shape:
     id          string   matches DOM ids  #m-<id> / #nav-<id>
     name, icon  string   metadata (nav/home labels — future use)
     order       number   load + display order (lower first)
     storageKeys string[] localStorage keys → drives sync + backup
     firstShow() optional called once, the first time the module opens
     show()      optional called every time the module opens
     onRemote()  optional called after a Firestore pull to refresh the view
     dashboard() optional updates this module's card on the home screen
   ═══════════════════════════════════════════════════════════════════ */

const found = import.meta.glob('./*/index.js', { eager: true });

export const MODULES = Object.values(found)
  .map((m) => m.default)
  .filter(Boolean)
  .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

export const MODULE_BY_ID = Object.fromEntries(MODULES.map((m) => [m.id, m]));

// every localStorage key any module wants synced/backed-up
export const SYNC_KEYS = MODULES.flatMap((m) => m.storageKeys || []);
