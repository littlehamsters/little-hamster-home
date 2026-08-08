/* Future expenses module */
const _FE_KEY = 'future_expenses_v1';

const CATEGORIES = [
  { id: 'home',      name: 'บ้าน/ซ่อมแซม', emoji: '🏠', color: '#9A7B4F' },
  { id: 'car',       name: 'ยานพาหนะ',      emoji: '🚗', color: '#5BA9C4' },
  { id: 'health',    name: 'สุขภาพ',         emoji: '🏥', color: '#C47A6A' },
  { id: 'insurance', name: 'ประกัน',          emoji: '🛡️', color: '#5E9A6A' },
  { id: 'edu',       name: 'การศึกษา',        emoji: '🎓', color: '#8A6BA8' },
  { id: 'travel',    name: 'ท่องเที่ยว',      emoji: '✈️', color: '#4A8FA8' },
  { id: 'gift',      name: 'ของขวัญ/งาน',    emoji: '🎁', color: '#B87A4F' },
  { id: 'tech',      name: 'เทคโนโลยี',       emoji: '💻', color: '#5B7FA8' },
  { id: 'other',     name: 'อื่น ๆ',          emoji: '📦', color: '#8A8578' },
];
const catById = id => CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

let state = { items: [] };
let feFilter = 'upcoming';
let feEditId = null;
let fePickedCat = 'other';

/* ---------- storage ---------- */
function _feLoad() {
  try { const r = localStorage.getItem(_FE_KEY); if (r) state = JSON.parse(r); } catch (e) { state = { items: [] }; }
  if (!state.items) state.items = [];
}
function _feSave() { try { localStorage.setItem(_FE_KEY, JSON.stringify(state)); } catch (e) {} }

/* ---------- helpers ---------- */
const _feFmt = n => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const _feParseNum = s => { const v = parseFloat(String(s).replace(/,/g, '').trim()); return isNaN(v) ? null : v; };
const _feUid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const _feEsc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function _feDaysUntil(iso) {
  if (!iso) return null;
  const t = new Date(iso + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((t - today) / 86400000);
}

function _feShortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

/* ---------- render ---------- */
function _feRender() {
  const upcoming = state.items.filter(i => i.status === 'upcoming');
  const paid = state.items.filter(i => i.status === 'paid');
  const overdue = upcoming.filter(i => (_feDaysUntil(i.dueDate) ?? 1) < 0);
  const soon = upcoming.filter(i => { const d = _feDaysUntil(i.dueDate); return d !== null && d >= 0 && d <= 30; });
  const totalUpcoming = upcoming.reduce((s, i) => s + (i.amt || 0), 0);

  document.getElementById('fe-summary').innerHTML = `
    <div class="fe-stat"><div class="fe-stat-lbl">รอชำระทั้งหมด</div><div class="fe-stat-val accent">${_feFmt(totalUpcoming)} <small>บาท</small></div></div>
    <div class="fe-stat"><div class="fe-stat-lbl">ใกล้ครบกำหนด (≤30 วัน)</div><div class="fe-stat-val warn">${soon.length} <small>รายการ</small></div></div>
    <div class="fe-stat"><div class="fe-stat-lbl">เลยกำหนด</div><div class="fe-stat-val over">${overdue.length} <small>รายการ</small></div></div>
    <div class="fe-stat"><div class="fe-stat-lbl">ชำระแล้ว</div><div class="fe-stat-val ok">${paid.length} <small>รายการ</small></div></div>
  `;

  document.getElementById('fe-filterbar').innerHTML = [
    ['upcoming', 'รอชำระ', upcoming.length],
    ['paid', 'ชำระแล้ว', paid.length],
    ['all', 'ทั้งหมด', state.items.length],
  ].map(([id, label, count]) =>
    `<button class="fe-filter-btn${feFilter === id ? ' active' : ''}" onclick="feSetFilter('${id}')">${label}${count > 0 ? ` <span class="fe-badge">${count}</span>` : ''}</button>`
  ).join('');

  const items = feFilter === 'paid'
    ? [...paid].sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || ''))
    : feFilter === 'upcoming'
    ? [...upcoming].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
    : [...state.items].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));

  const board = document.getElementById('fe-board');
  if (!items.length) {
    board.innerHTML = `<div class="fe-empty"><div class="fe-empty-icon">📋</div>
      <h3>${feFilter === 'paid' ? 'ยังไม่มีรายการที่ชำระแล้ว' : 'ยังไม่มีค่าใช้จ่ายที่วางแผนไว้'}</h3>
      ${feFilter !== 'paid' ? '<button class="btn btn-primary" onclick="feOpenEdit()">+ เพิ่มรายการแรก</button>' : ''}
    </div>`;
    return;
  }

  board.innerHTML = items.map(feCard).join('');
}

function feCard(item) {
  const days = _feDaysUntil(item.dueDate);
  const cat = catById(item.category || 'other');
  const isPaid = item.status === 'paid';

  let countdownHtml = '';
  let tone = '';
  if (item.dueDate) {
    if (isPaid) {
      countdownHtml = `<div class="fe-countdown ok">✅ ชำระแล้ว · ${_feShortDate(item.dueDate)}</div>`;
    } else if (days === null) {
      countdownHtml = '';
    } else if (days < 0) {
      tone = 'overdue';
      countdownHtml = `<div class="fe-countdown over">🔴 เลยกำหนดมา ${Math.abs(days)} วัน · ${_feShortDate(item.dueDate)}</div>`;
    } else if (days === 0) {
      tone = 'today';
      countdownHtml = `<div class="fe-countdown warn">🟠 ครบกำหนดวันนี้</div>`;
    } else if (days <= 7) {
      tone = 'soon';
      countdownHtml = `<div class="fe-countdown warn">🟡 เหลืออีก ${days} วัน · ${_feShortDate(item.dueDate)}</div>`;
    } else if (days <= 30) {
      tone = 'near';
      countdownHtml = `<div class="fe-countdown warn">⏳ เหลืออีก ${days} วัน · ${_feShortDate(item.dueDate)}</div>`;
    } else {
      countdownHtml = `<div class="fe-countdown">⏳ เหลืออีก ${days} วัน · ${_feShortDate(item.dueDate)}</div>`;
    }
  }

  const actions = isPaid
    ? `<button class="btn btn-ghost" onclick="feUnpay('${item.id}')">ยกเลิกการชำระ</button>
       <button class="btn" onclick="feOpenEdit('${item.id}')">แก้ไข</button>`
    : `<button class="btn btn-primary" onclick="fePay('${item.id}')">✓ ชำระแล้ว</button>
       <button class="btn" onclick="feOpenEdit('${item.id}')">แก้ไข</button>`;

  return `<div class="fe-card${isPaid ? ' paid' : ''}${tone ? ' tone-' + tone : ''}">
    <div class="fe-card-head">
      <span class="fe-cat-chip" style="--cc:${cat.color}">${cat.emoji} ${cat.name}</span>
      <span class="fe-amt">${_feFmt(item.amt)} <small>บาท</small></span>
    </div>
    <div class="fe-card-name">${_feEsc(item.name)}</div>
    ${item.note ? `<div class="fe-card-note">${_feEsc(item.note)}</div>` : ''}
    ${countdownHtml}
    <div class="fe-card-actions">${actions}</div>
  </div>`;
}

function feSetFilter(id) { feFilter = id; _feRender(); }

/* ---------- pay / unpay ---------- */
function fePay(id) {
  const item = state.items.find(x => x.id === id);
  if (item) { item.status = 'paid'; _feSave(); _feRender(); }
}
function feUnpay(id) {
  const item = state.items.find(x => x.id === id);
  if (item) { item.status = 'upcoming'; _feSave(); _feRender(); }
}

/* ---------- edit modal ---------- */
function feOpenEdit(id) {
  feEditId = id || null;
  const item = id ? state.items.find(x => x.id === id) : null;
  document.getElementById('fe-modal-title').textContent = item ? 'แก้ไขรายการ' : 'เพิ่มค่าใช้จ่าย';
  document.getElementById('fe-inp-name').value = item ? item.name : '';
  document.getElementById('fe-inp-amt').value = item ? item.amt : '';
  document.getElementById('fe-inp-date').value = item ? (item.dueDate || '') : '';
  document.getElementById('fe-inp-note').value = item ? (item.note || '') : '';
  fePickedCat = item ? (item.category || 'other') : 'other';
  feBuildCat();
  document.getElementById('fe-modal-err').style.display = 'none';

  const delBtn = document.getElementById('fe-modal-delete');
  if (item) {
    delBtn.style.display = 'inline-flex';
    delBtn.textContent = 'ลบ';
    delBtn.classList.remove('arm');
    let armed = false;
    delBtn.onclick = () => {
      if (!armed) { armed = true; delBtn.textContent = 'กดอีกครั้งเพื่อลบ'; delBtn.classList.add('arm'); return; }
      state.items = state.items.filter(x => x.id !== id);
      _feSave(); _feRender(); feCloseModal();
    };
  } else {
    delBtn.style.display = 'none';
  }

  document.getElementById('fe-modal').classList.add('show');
  setTimeout(() => document.getElementById('fe-inp-name').focus(), 50);
}

function feBuildCat() {
  document.getElementById('fe-cat-row').innerHTML = CATEGORIES.map(c =>
    `<button type="button" class="fe-cat-pick${c.id === fePickedCat ? ' active' : ''}" onclick="fePickCat('${c.id}')" style="--cc:${c.color}">${c.emoji} ${c.name}</button>`
  ).join('');
}
function fePickCat(id) { fePickedCat = id; feBuildCat(); }

function feSaveEdit() {
  const name = document.getElementById('fe-inp-name').value.trim();
  const amt = _feParseNum(document.getElementById('fe-inp-amt').value);
  const dueDate = document.getElementById('fe-inp-date').value || '';
  const note = document.getElementById('fe-inp-note').value.trim();
  const err = document.getElementById('fe-modal-err');
  if (!name) { err.textContent = 'ใส่ชื่อรายการก่อนนะ'; err.style.display = 'block'; return; }
  if (amt === null || amt <= 0) { err.textContent = 'ใส่จำนวนเงินที่มากกว่า 0'; err.style.display = 'block'; return; }
  if (feEditId) {
    const item = state.items.find(x => x.id === feEditId);
    Object.assign(item, { name, amt, dueDate, note, category: fePickedCat });
  } else {
    state.items.push({ id: _feUid(), name, amt, dueDate, note, category: fePickedCat, status: 'upcoming', createdAt: Date.now() });
  }
  _feSave(); _feRender(); feCloseModal();
}

function feCloseModal() { document.getElementById('fe-modal').classList.remove('show'); }

/* ---------- wire up ---------- */
document.getElementById('fe-btn-add').onclick = () => feOpenEdit();
document.getElementById('fe-modal-cancel').onclick = feCloseModal;
document.getElementById('fe-modal-save').onclick = feSaveEdit;
document.getElementById('fe-inp-name').addEventListener('keydown', e => { if (e.key === 'Enter') feSaveEdit(); });
document.getElementById('fe-modal').addEventListener('click', e => { if (e.target === document.getElementById('fe-modal')) feCloseModal(); });

Object.assign(window, {
  _feLoad, _feSave, _feRender,
  feSetFilter, fePay, feUnpay,
  feOpenEdit, feBuildCat, fePickCat, feSaveEdit, feCloseModal,
});
