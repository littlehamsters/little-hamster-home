/* ═══════════════════════════════════════════════════════════════════
   App shell — registry-driven navigation, home dashboard, backup/restore.
   All per-module behaviour lives in each module's descriptor (see
   src/modules/<id>/index.js); this file only orchestrates.
   ═══════════════════════════════════════════════════════════════════ */
import { MODULES, MODULE_BY_ID, SYNC_KEYS } from '../modules/registry.js';

/* ── Navigation ──────────────────────────────────────────────────── */
const _shown = new Set(); // modules opened at least once (for firstShow)

const NAV_ICONS = {
  home: 'ti-layout-dashboard',
  mortgage: 'ti-home-2',
  savings: 'ti-pig-money',
  budget: 'ti-wallet',
  salary: 'ti-receipt-tax',
  car: 'ti-car',
};
const navIcon = (id) => NAV_ICONS[id] || 'ti-point';

export function buildNavMenu() {
  const menu = document.getElementById('nav-menu');
  if (!menu) return;
  const items = [{ id: 'home', name: 'หน้าหลัก' }].concat(
    MODULES.map((m) => ({ id: m.id, name: m.name }))
  );
  menu.innerHTML = items
    .map(
      (it) =>
        `<button class="nav-menu-item" data-id="${it.id}" onclick="showModule('${it.id}');closeNavMenu()"><i class="ti ${navIcon(it.id)}"></i> ${it.name}</button>`
    )
    .join('');
}

export function toggleNavMenu(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('nav-menu');
  if (menu) menu.classList.toggle('open');
}

export function closeNavMenu() {
  const menu = document.getElementById('nav-menu');
  if (menu) menu.classList.remove('open');
}

export function updateBreadcrumb(n) {
  const bc = document.getElementById('breadcrumb');
  if (!bc) return;
  if (n === 'home') {
    bc.innerHTML =
      '<span class="bc-item bc-current"><i class="ti ti-home"></i> หน้าหลัก</span>';
  } else {
    const m = MODULE_BY_ID[n];
    const name = m ? m.name : n;
    bc.innerHTML =
      '<button class="bc-item" onclick="showModule(\'home\')"><i class="ti ti-home"></i> หน้าหลัก</button>' +
      '<span class="bc-sep"><i class="ti ti-chevron-right"></i></span>' +
      '<span class="bc-item bc-current"><i class="ti ' +
      navIcon(n) +
      '"></i> ' +
      name +
      '</span>';
  }
  document
    .querySelectorAll('.nav-menu-item')
    .forEach((b) => b.classList.toggle('active', b.dataset.id === n));
}

/* ── Dark mode ───────────────────────────────────────────────────── */
function _syncDarkIcon(on) {
  const i = document.querySelector('#darkBtn i');
  if (i) i.className = 'ti ' + (on ? 'ti-sun' : 'ti-moon');
}
export function toggleDark() {
  const on = document.documentElement.classList.toggle('dark');
  try { localStorage.setItem('ui_dark', on ? '1' : '0'); } catch (e) {}
  _syncDarkIcon(on);
}
export function applyDarkPref() {
  let on = false;
  try { on = localStorage.getItem('ui_dark') === '1'; } catch (e) {}
  document.documentElement.classList.toggle('dark', on);
  _syncDarkIcon(on);
}

export function showModule(n) {
  document.querySelectorAll('.m-app').forEach((e) => (e.style.display = 'none'));
  const target = document.getElementById('m-' + n);
  if (target) target.style.display = 'block';
  updateBreadcrumb(n);

  if (n === 'home') {
    loadDash();
  } else {
    const m = MODULE_BY_ID[n];
    if (m) {
      try {
        if (!_shown.has(n)) {
          _shown.add(n);
          (m.firstShow || m.show)?.();
        } else {
          m.show?.();
        }
      } catch (e) {
        console.error(e);
      }
    }
  }
  window.scrollTo(0, 0);
}

/* ── Home dashboard ──────────────────────────────────────────────── */
export function loadDash() {
  MODULES.forEach((m) => {
    try {
      m.dashboard?.();
    } catch (e) {
      console.error(e);
    }
  });
}

/* ── Refresh after a Firestore pull (called by firebase.js) ──────── */
export function applyRemote() {
  MODULES.forEach((m) => {
    try {
      m.onRemote?.();
    } catch (e) {}
  });
  _shown.clear(); // force re-init on next open (mirrors old _xxReady=false)
  loadDash();
}

/* ── Unified backup / restore (all modules) ──────────────────────── */
export function unifiedBackup() {
  const d = new Date();
  const data = {};
  SYNC_KEYS.forEach((k) => {
    data[k] = localStorage.getItem(k);
  });
  const payload = {
    version: 2,
    created: d.toISOString(),
    note: 'Little Home unified backup',
    data,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'little_home_' + d.toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function unifiedRestore(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const d = JSON.parse(e.target.result);
      const set = (k, v) => {
        if (v != null && v !== '') localStorage.setItem(k, v);
      };
      if (d.version >= 2 && d.data) {
        // new generic format: { data: { <storageKey>: <json string> } }
        Object.entries(d.data).forEach(([k, v]) => set(k, v));
      } else {
        // legacy v1 format — keep restoring old backup files
        if (d.budget) {
          set('bp3_months', d.budget.months);
          set('bp3_cfg', d.budget.cfg);
          set('bp3_theme', d.budget.theme);
        }
        set('mortgage_real_v5', d.mortgage);
        set('savings_jars_v1', d.savings);
        set('salaryTaxPlanner_v2', d.salary);
      }
      applyRemote();
      alert('นำเข้าสำเร็จ ✓');
    } catch (err) {
      alert('ไฟล์ไม่ถูกต้อง: ' + err.message);
    }
  };
  reader.readAsText(file);
}

/* ── Boot ────────────────────────────────────────────────────────── */
export function initShell() {
  // inline onclick handlers in index.html call these as globals
  Object.assign(window, {
    showModule,
    loadDash,
    unifiedBackup,
    unifiedRestore,
    applyRemote,
    toggleNavMenu,
    closeNavMenu,
    buildNavMenu,
    updateBreadcrumb,
    toggleDark,
  });
  applyDarkPref();
  buildNavMenu();
  updateBreadcrumb('home');
  document.addEventListener('click', (e) => {
    const wrap = document.querySelector('.nav-menu-wrap');
    if (wrap && !wrap.contains(e.target)) closeNavMenu();
  });
  loadDash();
}
