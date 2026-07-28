/* ═══════════════════════════════════════════════════════════════════
   Entry point. Import order matters:
   1. registry  → glob-loads every module engine (they expose their
      window.* functions + inline handlers) before anything uses them.
   2. firebase  → installs the localStorage→Firestore sync intercept and
      boots Google auth.
   3. app shell → registry-driven nav / dashboard / backup; initShell()
      wires the global handlers and paints the home cards.
   ═══════════════════════════════════════════════════════════════════ */
import './modules/registry.js';
import './core/firebase.js';
import { initShell } from './core/app.js';

initShell();
