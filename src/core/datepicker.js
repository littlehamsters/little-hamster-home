/* ═══════════════════════════════════════════════════════════════════
   Lightweight popup DatePicker (Sakai style) — enhances <input.mo-dp>.
   Keeps the ISO value (YYYY-MM-DD) in inp.dataset.iso for logic to read
   via window.moGetDate(el); shows a formatted DD/MM/YYYY in the field.
   ═══════════════════════════════════════════════════════════════════ */
const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const MON = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function parseIso(s) {
  if (!s) return null;
  const [y, m, d] = String(s).split('-').map(Number);
  if (!y) return null;
  return new Date(y, (m || 1) - 1, d || 1);
}
function fmtDisp(s) {
  const d = parseIso(s);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '';
}

let _pop = null;
let _anchor = null;
function closePop() {
  if (_pop) {
    _pop.remove();
    _pop = null;
    _anchor = null;
    document.removeEventListener('click', _outside, true);
    window.removeEventListener('scroll', _reposition, true);
    window.removeEventListener('resize', _reposition);
  }
}
function _outside(e) {
  if (_pop && !_pop.contains(e.target) && !e.target.closest('.mo-dp-field')) closePop();
}
function _positionPop() {
  if (!_pop || !_anchor) return;
  const r = _anchor.getBoundingClientRect();
  const w = _pop.offsetWidth || 280;
  const h = _pop.offsetHeight || 320;
  let left = r.left;
  if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
  let top = r.bottom + 6;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
  _pop.style.left = Math.max(8, left) + 'px';
  _pop.style.top = top + 'px';
}
function _reposition() { _positionPop(); }

function setVal(inp, isoVal) {
  inp.dataset.iso = isoVal || '';
  inp.value = isoVal ? fmtDisp(isoVal) : '';
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  inp.dispatchEvent(new Event('change', { bubbles: true }));
}

function buildCalendar(inp, view) {
  const pop = document.createElement('div');
  pop.className = 'mo-dp-pop';
  const sel = parseIso(inp.dataset.iso);
  const today = new Date();
  const y = view.getFullYear();
  const m = view.getMonth();
  const startDow = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const prevDays = new Date(y, m, 0).getDate();
  let cells = '';
  for (let i = startDow - 1; i >= 0; i--)
    cells += `<button class="mo-dp-day mo-dp-out" disabled>${prevDays - i}</button>`;
  for (let d = 1; d <= days; d++) {
    const cIso = iso(new Date(y, m, d));
    const t = iso(today) === cIso ? ' is-today' : '';
    const s = sel && iso(sel) === cIso ? ' is-sel' : '';
    cells += `<button class="mo-dp-day${t}${s}" data-iso="${cIso}">${d}</button>`;
  }
  const trail = (7 - ((startDow + days) % 7)) % 7;
  for (let d = 1; d <= trail; d++)
    cells += `<button class="mo-dp-day mo-dp-out" disabled>${d}</button>`;
  pop.innerHTML =
    `<div class="mo-dp-head">` +
    `<button type="button" class="mo-dp-nav" data-nav="-1"><i class="ti ti-chevron-left"></i></button>` +
    `<div class="mo-dp-title">${MON[m]} ${y}</div>` +
    `<button type="button" class="mo-dp-nav" data-nav="1"><i class="ti ti-chevron-right"></i></button>` +
    `</div>` +
    `<div class="mo-dp-dow">${DOW.map((x) => `<span>${x}</span>`).join('')}</div>` +
    `<div class="mo-dp-grid">${cells}</div>` +
    `<div class="mo-dp-foot"><button type="button" class="mo-dp-today">วันนี้</button><button type="button" class="mo-dp-clear">ล้าง</button></div>`;
  pop.querySelectorAll('.mo-dp-nav').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      const nd = new Date(y, m + Number(b.dataset.nav), 1);
      const np = buildCalendar(inp, nd);
      np.style.position = 'fixed';
      np.style.left = pop.style.left;
      np.style.top = pop.style.top;
      pop.replaceWith(np);
      _pop = np;
      _positionPop();
    };
  });
  pop.querySelectorAll('.mo-dp-day[data-iso]').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      setVal(inp, b.dataset.iso);
      closePop();
    };
  });
  pop.querySelector('.mo-dp-today').onclick = (e) => {
    e.stopPropagation();
    setVal(inp, iso(new Date()));
    closePop();
  };
  pop.querySelector('.mo-dp-clear').onclick = (e) => {
    e.stopPropagation();
    setVal(inp, '');
    closePop();
  };
  return pop;
}

function openFor(inp) {
  closePop();
  const pop = buildCalendar(inp, parseIso(inp.dataset.iso) || new Date());
  pop.style.position = 'fixed';
  document.body.appendChild(pop);
  _pop = pop;
  _anchor = inp;
  _positionPop();
  setTimeout(() => document.addEventListener('click', _outside, true), 0);
  window.addEventListener('scroll', _reposition, true);
  window.addEventListener('resize', _reposition);
}

export function moInitDatePickers(root) {
  (root || document).querySelectorAll('input.mo-dp:not([data-dp])').forEach((inp) => {
    inp.dataset.dp = '1';
    const initial = inp.getAttribute('value') || inp.value || '';
    inp.type = 'text';
    inp.readOnly = true;
    inp.autocomplete = 'off';
    inp.dataset.iso = initial;
    inp.value = initial ? fmtDisp(initial) : '';
    if (!inp.placeholder) inp.placeholder = 'วว/ดด/ปปปป';
    let field = inp.parentElement;
    if (!field || !field.classList.contains('mo-dp-field')) {
      field = document.createElement('div');
      field.className = 'mo-dp-field';
      inp.parentNode.insertBefore(field, inp);
      field.appendChild(inp);
    }
    const icon = document.createElement('button');
    icon.type = 'button';
    icon.className = 'mo-dp-icon';
    icon.innerHTML = '<i class="ti ti-calendar"></i>';
    field.appendChild(icon);
    const toggle = (e) => {
      e.stopPropagation();
      if (_pop && field.contains(_pop)) closePop();
      else openFor(inp);
    };
    inp.addEventListener('click', toggle);
    icon.addEventListener('click', toggle);
  });
}

window.moInitDatePickers = moInitDatePickers;
window.moGetDate = (el) => {
  const e = typeof el === 'string' ? document.getElementById(el) : el;
  return e ? e.dataset.iso || '' : '';
};
