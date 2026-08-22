/* ═══════════════════════════════════════════════════════════════════
   Custom Select (Sakai style) — enhances <select.mo-sel> with a themed
   trigger + popup list so the open menu isn't the OS-native (dark) list.
   The underlying <select> stays the source of truth (value + change event).
   window.moSelectRefresh(sel) resyncs the trigger after options change.
   ═══════════════════════════════════════════════════════════════════ */
let _pop = null;
let _anchorWrap = null;
function closeSel() {
  if (_pop) {
    _pop.remove();
    _pop = null;
    _anchorWrap = null;
    document.querySelectorAll('.mo-sel-wrap.open').forEach((w) => w.classList.remove('open'));
    document.removeEventListener('click', _outside, true);
    window.removeEventListener('scroll', _reposList, true);
    window.removeEventListener('resize', _reposList);
  }
}
function _outside(e) {
  if (_pop && !_pop.contains(e.target) && !e.target.closest('.mo-sel-wrap')) closeSel();
}
function _positionList() {
  if (!_pop || !_anchorWrap) return;
  const r = _anchorWrap.getBoundingClientRect();
  const w = Math.max(r.width, _pop.offsetWidth || r.width);
  const h = _pop.offsetHeight || 260;
  let left = r.left;
  if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
  let top = r.bottom + 4;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 4);
  _pop.style.left = Math.max(8, left) + 'px';
  _pop.style.top = top + 'px';
  _pop.style.minWidth = r.width + 'px';
}
function _reposList() { _positionList(); }

function openList(sel, wrap, refresh) {
  if (_pop && _anchorWrap === wrap) {
    closeSel();
    return;
  }
  closeSel();
  const list = document.createElement('div');
  list.className = 'mo-sel-list';
  list.style.position = 'fixed';
  list.innerHTML = [...sel.options]
    .map(
      (o, i) =>
        `<button type="button" class="mo-sel-opt${i === sel.selectedIndex ? ' is-sel' : ''}" data-i="${i}">${o.textContent}</button>`
    )
    .join('');
  list.querySelectorAll('.mo-sel-opt').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      sel.selectedIndex = Number(b.dataset.i);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      refresh();
      closeSel();
    };
  });
  document.body.appendChild(list);
  wrap.classList.add('open');
  _pop = list;
  _anchorWrap = wrap;
  _positionList();
  const cur = list.querySelector('.mo-sel-opt.is-sel');
  if (cur) cur.scrollIntoView({ block: 'nearest' });
  setTimeout(() => document.addEventListener('click', _outside, true), 0);
  window.addEventListener('scroll', _reposList, true);
  window.addEventListener('resize', _reposList);
}

export function moInitSelects(root) {
  (root || document).querySelectorAll('select.mo-sel:not([data-sel])').forEach((sel) => {
    sel.dataset.sel = '1';
    sel.style.display = 'none';
    let wrap = sel.parentElement;
    if (!wrap || !wrap.classList.contains('mo-sel-wrap')) {
      wrap = document.createElement('div');
      wrap.className = 'mo-sel-wrap';
      sel.parentNode.insertBefore(wrap, sel);
      wrap.appendChild(sel);
    }
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'mo-sel-trigger';
    const lead = sel.dataset.icon
      ? `<i class="ti ${sel.dataset.icon} mo-sel-ic"></i>`
      : '<span class="mo-sel-lead"></span>';
    trigger.innerHTML = lead + '<span class="mo-sel-label"></span><i class="ti ti-chevron-down mo-sel-caret"></i>';
    wrap.appendChild(trigger);
    const refresh = () => {
      const o = sel.options[sel.selectedIndex];
      wrap.querySelector('.mo-sel-label').textContent = o ? o.textContent : '';
    };
    refresh();
    sel.addEventListener('change', refresh);
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      openList(sel, wrap, refresh);
    });
    wrap._moRefresh = refresh;
  });
}

window.moInitSelects = moInitSelects;
window.moSelectRefresh = (sel) => {
  const e = typeof sel === 'string' ? document.getElementById(sel) : sel;
  if (e && e.parentElement && e.parentElement._moRefresh) e.parentElement._moRefresh();
};

/* auto-enhance any dynamically-rendered <select class="mo-sel"> */
if (typeof MutationObserver !== 'undefined') {
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.matches && n.matches('select.mo-sel')) moInitSelects(n.parentElement || document);
        else if (n.querySelector && n.querySelector('select.mo-sel')) moInitSelects(n);
      }
    }
  });
  const start = () => document.body && obs.observe(document.body, { childList: true, subtree: true });
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
}
