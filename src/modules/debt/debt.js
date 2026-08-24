/* Debt module — grouped debts, each split into installments (งวด).
   Every installment carries a source→destination account (user-defined,
   colour-tagged), a status and a date. Master–detail like the car module. */

const DEBT_KEY = 'debt_v1';
const ACC_COLORS = ['green', 'yellow', 'purple', 'blue', 'pink', 'teal', 'orange', 'gray'];
const STATUSES = {
  pending: { label: 'รอจ่าย', cls: 'pending' },
  done: { label: 'จ่ายแล้ว', cls: 'done' },
  deferred: { label: 'เลื่อน', cls: 'deferred' },
};
const STATUS_CYCLE = ['pending', 'done', 'deferred'];

let debtState = { accounts: [], debts: [], sel: '' };
let debtView = 'list'; // 'list' (overview) | 'detail' (one debt)
let _dPickColor = ACC_COLORS[0]; // scratch: colour chosen in the account modal

/* ── helpers ─────────────────────────────────────────────────────── */
const _dUid = () => 'd' + Math.random().toString(36).slice(2, 8);
const _dEsc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
const _dNum = (v) => {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  return isFinite(n) ? n : 0;
};
const _dFmt = (v) => Math.round(v).toLocaleString('th-TH');
const _dToday = () => {
  const d = new Date();
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
};
const _dShortDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
};
const _dThisMonth = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
};
// add n months to a "YYYY-MM" month string → returns "YYYY-MM-01"
const _dAddMonths = (month, n) => {
  const base = month && /^\d{4}-\d{2}/.test(month) ? month.slice(0, 7) : _dThisMonth();
  const [y, m] = base.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
};
// display an installment date as month + Buddhist year (e.g. "มิ.ย. 2567")
const _dMonthYear = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' });
};
const _dNv = (id) => {
  const el = document.getElementById(id);
  return el ? (el.dataset.iso != null ? el.dataset.iso : el.value) : '';
};

function _dToast(m) {
  let t = document.getElementById('_debtToast');
  if (!t) {
    t = document.createElement('div');
    t.id = '_debtToast';
    t.className = 'debt-toast';
    document.getElementById('m-debt').appendChild(t);
  }
  t.textContent = m;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2000);
}

/* ── persistence ─────────────────────────────────────────────────── */
function _debtLoad() {
  try {
    const raw = JSON.parse(localStorage.getItem(DEBT_KEY) || 'null');
    if (raw && Array.isArray(raw.debts)) debtState = raw;
  } catch (e) {}
  debtState.accounts = (debtState.accounts || []).map((a) => ({
    id: a.id || _dUid(),
    name: a.name || 'บัญชี',
    color: ACC_COLORS.includes(a.color) ? a.color : 'gray',
  }));
  debtState.debts = (debtState.debts || []).map((d) => ({
    id: d.id || _dUid(),
    name: d.name || 'หนี้',
    total: _dNum(d.total),
    count: parseInt(d.count, 10) || (Array.isArray(d.items) ? d.items.length : 0),
    start: d.start || '',
    type: d.type === 'credit' ? 'credit' : 'account', // ประเภท: บัญชี | บัตรเครดิต/อื่นๆ
    owner: d.owner || d.to || '', // เจ้าของหนี้ = บัญชีปลายทาง (แบบเลือกบัญชี)
    ownerText: d.ownerText || '', // เจ้าของหนี้แบบพิมพ์เอง (บัตรเครดิต/อื่นๆ)
    debtor: d.debtor || d.from || '', // ลูกหนี้ = บัญชีต้นทาง
    note: d.note || '',
    items: (Array.isArray(d.items) ? d.items : []).map((i) => ({
      id: i.id || _dUid(),
      amount: _dNum(i.amount),
      acc: i.acc || i.from || d.debtor || '', // ต้นทาง (จ่ายจาก) = ลูกหนี้ โดย default
      dest: i.dest || i.to || d.owner || '', // ปลายทาง = เจ้าของหนี้ โดย default
      status: STATUSES[i.status] ? i.status : 'pending',
      date: i.date || '',
      note: i.note || '',
      manual: !!i.manual, // งวดที่เพิ่มเอง (ไม่ถูก regenerate ตอนแก้ไขหนี้)
    })),
  }));
  if (!debtState.sel || !debtState.debts.some((d) => d.id === debtState.sel)) {
    debtState.sel = debtState.debts[0] ? debtState.debts[0].id : '';
  }
}
function _debtSave() {
  try {
    localStorage.setItem(DEBT_KEY, JSON.stringify(debtState));
  } catch (e) {}
}
const _debtSel = () => debtState.debts.find((d) => d.id === debtState.sel) || null;

// build the installment schedule from total/count/start/accounts; even split
// (remainder on last งวด), one per month. Preserves status/note/id by index.
// regenerate only the AUTO schedule (manual งวด are kept separately)
function _dGenItems(total, count, start, owner, debtor, prevAuto) {
  const items = [];
  if (!(total > 0 && count > 0)) return items;
  const base = Math.round(total / count);
  for (let i = 0; i < count; i++) {
    const amount = i === count - 1 ? total - base * (count - 1) : base;
    const p = prevAuto && prevAuto[i];
    // debt-level setting is authoritative: ต้นทาง=ลูกหนี้, ปลายทาง=เจ้าของหนี้
    // (fall back to any existing per-งวด value only when the setting is blank)
    items.push({
      id: (p && p.id) || _dUid(),
      amount,
      acc: debtor || (p && p.acc) || '',
      dest: owner || (p && p.dest) || '',
      status: (p && p.status) || 'pending',
      date: _dAddMonths(start, i),
      note: (p && p.note) || '',
      manual: false,
    });
  }
  return items;
}
// combine regenerated auto schedule with existing manual งวด (kept as-is)
function _dRebuildItems(d, f) {
  const prevAuto = (d.items || []).filter((i) => !i.manual);
  const manual = (d.items || []).filter((i) => i.manual);
  const auto = _dGenItems(f.total, f.count, f.start, f.owner, f.debtor, prevAuto);
  return auto.concat(manual);
}

/* ── accounts ────────────────────────────────────────────────────── */
const _dAcc = (id) => debtState.accounts.find((a) => a.id === id) || null;
function _dAccChip(id) {
  const a = _dAcc(id);
  if (!a) return '<span class="acc-chip none">—</span>';
  return `<span class="acc-chip ${a.color}">${_dEsc(a.name)}</span>`;
}
// เจ้าของหนี้ (ปลายทาง) chip — บัตรเครดิต = ข้อความที่พิมพ์เอง / บัญชี = chip สีของบัญชี
function _dOwnerChip(d) {
  if (d.type === 'credit')
    return `<span class="acc-chip credit">${_dEsc(d.ownerText || '—')}</span>`;
  return _dAccChip(d.owner);
}
function _dAccOptions(sel) {
  const first = '<option value="">— เลือกบัญชี —</option>';
  return (
    first +
    debtState.accounts
      .map((a) => `<option value="${a.id}" ${a.id === sel ? 'selected' : ''}>${_dEsc(a.name)}</option>`)
      .join('')
  );
}

/* ── totals ──────────────────────────────────────────────────────── */
const _dItemsSum = (d) => (d.items || []).reduce((s, i) => s + _dNum(i.amount), 0);
const _dDebtTotal = (d) => _dNum(d.total) || _dItemsSum(d);
const _dDebtPaid = (d) =>
  (d.items || []).filter((i) => i.status === 'done').reduce((s, i) => s + _dNum(i.amount), 0);
const _dDebtRemain = (d) => Math.max(0, _dDebtTotal(d) - _dDebtPaid(d));
const _dDebtPct = (d) => {
  const t = _dDebtTotal(d);
  return t > 0 ? Math.min(100, Math.round((_dDebtPaid(d) / t) * 100)) : 0;
};

/* ═══ MODALS ══════════════════════════════════════════════════════ */
function _debtModal(title, bodyHtml, saveLabel, saveExpr, wide) {
  const area = document.getElementById('debtModalArea');
  if (!area) return;
  area.innerHTML = `
    <div class="debt-overlay show" onclick="if(event.target===this)debtCloseModal()">
      <div class="debt-modal${wide ? ' wide' : ''}">
        <div class="debt-modal-head"><h3>${title}</h3>
          <button class="debt-modal-x" onclick="debtCloseModal()" aria-label="ปิด"><i class="ti ti-x"></i></button></div>
        <div class="debt-modal-body">${bodyHtml}</div>
        ${
          saveExpr
            ? `<div class="debt-modal-foot">
                 <button class="debt-btn" onclick="debtCloseModal()">ยกเลิก</button>
                 <button class="debt-btn primary" onclick="${saveExpr}">${saveLabel}</button>
               </div>`
            : ''
        }
      </div>
    </div>`;
  if (window.moInitSelects) window.moInitSelects(area);
  if (window.moInitDatePickers) window.moInitDatePickers(area);
  setTimeout(() => area.querySelector('input,select')?.focus(), 30);
}
function debtCloseModal() {
  const a = document.getElementById('debtModalArea');
  if (a) a.innerHTML = '';
}

/* ── debt add / edit ─────────────────────────────────────────────── */
function debtOpenDebtModal(id) {
  const d = id ? debtState.debts.find((x) => x.id === id) : null;
  const cnt = d ? d.count || (d.items || []).length : '';
  const start = (d && d.start ? d.start.slice(0, 7) : '') || _dThisMonth();
  const type = (d && d.type) || 'account';
  _debtModal(
    d ? 'แก้ไขหนี้' : 'เพิ่มหนี้',
    `<label class="df">ชื่อหนี้<input type="text" id="debtName" maxlength="40" value="${
      d ? _dEsc(d.name) : ''
    }" placeholder="เช่น โฟมคืนกองกลาง"></label>
     <input type="hidden" id="debtType" value="${type}">
     <div class="df">ประเภทหนี้
       <div class="dtype-seg">
         <button type="button" class="dtype-btn${type === 'account' ? ' on' : ''}" data-t="account" onclick="debtSetType('account')">บุคคล / บัญชี</button>
         <button type="button" class="dtype-btn${type === 'credit' ? ' on' : ''}" data-t="credit" onclick="debtSetType('credit')">บัตรเครดิต / อื่นๆ</button>
       </div>
     </div>
     <div class="df-2col">
       <label class="df">ยอดรวมทั้งหมด (฿)<input type="text" inputmode="decimal" id="debtTotal" value="${
         d && d.total ? _dFmt(d.total) : ''
       }" placeholder="เช่น 35000"></label>
       <label class="df">จำนวนงวด <span class="df-hint">เดือนละงวด</span>
         <input type="number" inputmode="numeric" id="debtCount" min="1" max="120" value="${cnt}" placeholder="เช่น 5"></label>
     </div>
     <div class="df-2col">
       <div class="owner-slot">
         <label class="df" id="ownerAccWrap"${type === 'credit' ? ' style="display:none"' : ''}>เจ้าของหนี้ <span class="df-hint">= ปลายทาง</span><select class="mo-sel" id="debtOwner">${_dAccOptions(d ? d.owner : '')}</select></label>
         <label class="df" id="ownerTextWrap"${type === 'account' ? ' style="display:none"' : ''}>เจ้าของหนี้ <span class="df-hint">= เจ้าหนี้/บัตร (ปลายทาง)</span><input type="text" id="debtOwnerText" maxlength="40" value="${
           d ? _dEsc(d.ownerText) : ''
         }" placeholder="เช่น บัตร KTC, บัตรกรุงศรี"></label>
       </div>
       <label class="df">ลูกหนี้ <span class="df-hint">= ต้นทาง (จ่ายจาก)</span><select class="mo-sel" id="debtDebtor">${_dAccOptions(d ? d.debtor : '')}</select></label>
     </div>
     <label class="df">เริ่มงวดแรก (เดือน)<input type="month" id="debtStart" value="${_dEsc(start)}"></label>
     <div class="df-hint df-gen">💡 ระบบตั้งต้นทาง=ลูกหนี้ / ปลายทาง=เจ้าของหนี้ ให้ทุกงวด แล้วหารยอดเท่ากันตามจำนวนงวด เดือนละงวด<br>• บัตรเครดิต/อื่นๆ: พิมพ์ชื่อเจ้าหนี้เอง เป็นปลายทางคงที่ (แก้รายงวดไม่ได้)</div>
     <label class="df">หมายเหตุ<textarea id="debtNote" rows="2" placeholder="โน้ตเพิ่มเติม (ไม่บังคับ)">${
       d ? _dEsc(d.note) : ''
     }</textarea></label>`,
    d ? 'บันทึก' : 'เพิ่มหนี้',
    d ? `debtSaveDebt('${id}')` : 'debtAddDebt()'
  );
}
function debtSetType(t) {
  const el = document.getElementById('debtType');
  if (el) el.value = t;
  document.querySelectorAll('.dtype-btn').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
  const acc = document.getElementById('ownerAccWrap');
  const txt = document.getElementById('ownerTextWrap');
  if (acc) acc.style.display = t === 'credit' ? 'none' : '';
  if (txt) txt.style.display = t === 'credit' ? '' : 'none';
}
function _debtReadDebtForm() {
  const type = _dNv('debtType') === 'credit' ? 'credit' : 'account';
  return {
    name: (_dNv('debtName') || '').trim(),
    total: _dNum(_dNv('debtTotal')),
    count: Math.max(0, Math.min(120, parseInt(_dNv('debtCount'), 10) || 0)),
    type,
    owner: type === 'account' ? _dNv('debtOwner') || '' : '',
    ownerText: type === 'credit' ? (_dNv('debtOwnerText') || '').trim() : '',
    debtor: _dNv('debtDebtor') || '',
    start: _dNv('debtStart') || _dThisMonth(),
    note: (_dNv('debtNote') || '').trim(),
  };
}
function debtAddDebt() {
  const f = _debtReadDebtForm();
  if (!f.name) return _dToast('ใส่ชื่อหนี้ก่อนนะ 🐹');
  const items = _dGenItems(f.total, f.count, f.start, f.owner, f.debtor, null);
  const d = { id: _dUid(), ...f, items };
  debtState.debts.push(d);
  debtState.sel = d.id;
  debtView = items.length ? 'detail' : 'list';
  _debtSave();
  debtCloseModal();
  _debtRender();
  _dToast(items.length ? `สร้าง ${items.length} งวดให้แล้ว ✓` : 'เพิ่มหนี้แล้ว ✓');
}
function debtSaveDebt(id) {
  const d = debtState.debts.find((x) => x.id === id);
  if (!d) return;
  const f = _debtReadDebtForm();
  if (!f.name) return _dToast('ใส่ชื่อหนี้ก่อนนะ');
  // regenerate the AUTO schedule; keep any manual งวด that were added
  const items = _dRebuildItems(d, f);
  Object.assign(d, f, { items });
  _debtSave();
  debtCloseModal();
  _debtRender();
  _dToast('อัปเดตงวดแล้ว ✓');
}
function debtDelDebt(id) {
  const d = debtState.debts.find((x) => x.id === id);
  if (!d) return;
  if (!confirm('ลบหนี้ "' + d.name + '" และงวดทั้งหมด?')) return;
  debtState.debts = debtState.debts.filter((x) => x.id !== id);
  if (debtState.sel === id) debtState.sel = debtState.debts[0]?.id || '';
  debtView = 'list';
  _debtSave();
  _debtRender();
  _dToast('ลบหนี้แล้ว');
}

/* ── per-installment edits (rows are system-generated) ───────────── */
function debtToggleStatus(itemId) {
  const d = _debtSel();
  if (!d) return;
  const it = d.items.find((x) => x.id === itemId);
  if (!it) return;
  const i = STATUS_CYCLE.indexOf(it.status);
  it.status = STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length]; // รอจ่าย → จ่ายแล้ว → เลื่อน
  _debtSave();
  _debtRender();
}
function debtSetItemAcc(itemId, val) {
  const d = _debtSel();
  if (!d) return;
  const it = d.items.find((x) => x.id === itemId);
  if (!it) return;
  it.acc = val || '';
  _debtSave(); // no re-render: keep the row/select in place
}
function debtSetItemDest(itemId, val) {
  const d = _debtSel();
  if (!d) return;
  const it = d.items.find((x) => x.id === itemId);
  if (!it) return;
  it.dest = val || '';
  _debtSave(); // no re-render: keep the row/select in place
}
// manual งวด — for deferred/extra payments (survives debt-edit regeneration)
function debtOpenAddItemModal() {
  const d = _debtSel();
  if (!d) return;
  if (!debtState.accounts.length) return _dToast('ตั้ง Owner/บัญชีก่อนนะ');
  const last = (d.items || [])[d.items.length - 1];
  const nextMonth = _dAddMonths((last && last.date) || d.start, 1).slice(0, 7);
  const base = d.count > 0 ? Math.round(_dDebtTotal(d) / d.count) : 0;
  _debtModal(
    'เพิ่มงวด (เลื่อน/งวดพิเศษ)',
    `<div class="df-2col">
       <label class="df">จำนวนเงิน (฿)<input type="text" inputmode="decimal" id="miAmount" value="${
         base ? _dFmt(base) : ''
       }" placeholder="เช่น 1000"></label>
       <label class="df">เดือน<input type="month" id="miMonth" value="${_dEsc(nextMonth)}"></label>
     </div>
     <div class="df-2col">
       <label class="df">บัญชีต้นทาง (จ่ายจาก)<select class="mo-sel" id="miAcc">${_dAccOptions(d.debtor)}</select></label>
       ${
         d.type === 'credit'
           ? `<label class="df">บัญชีปลายทาง <span class="df-hint">(ล็อก)</span><div class="dtype-locked">${_dEsc(d.ownerText || '—')}</div></label>`
           : `<label class="df">บัญชีปลายทาง<select class="mo-sel" id="miDest">${_dAccOptions(d.owner)}</select></label>`
       }
     </div>
     <label class="df">หมายเหตุ<input type="text" id="miNote" placeholder="เช่น เลื่อนจ่ายจากงวด 3"></label>`,
    'เพิ่มงวด',
    'debtAddManualItem()'
  );
}
function debtAddManualItem() {
  const d = _debtSel();
  if (!d) return;
  const amount = _dNum(_dNv('miAmount'));
  if (!amount) return _dToast('ใส่จำนวนเงินก่อนนะ');
  d.items.push({
    id: _dUid(),
    amount,
    acc: _dNv('miAcc') || '',
    dest: _dNv('miDest') || '',
    status: 'pending',
    date: _dAddMonths(_dNv('miMonth') || _dThisMonth(), 0),
    note: (_dNv('miNote') || '').trim(),
    manual: true,
  });
  _debtSave();
  debtCloseModal();
  _debtRender();
  _dToast('เพิ่มงวดแล้ว ✓');
}
function debtDelItem(itemId) {
  const d = _debtSel();
  if (!d) return;
  d.items = d.items.filter((x) => x.id !== itemId);
  _debtSave();
  _debtRender();
}

/* ── accounts manager ────────────────────────────────────────────── */
function debtOpenAccModal() {
  _debtRenderAccModal();
}
function _debtRenderAccModal() {
  const rows = debtState.accounts.length
    ? debtState.accounts
        .map(
          (a) => `<div class="acc-row">
            <span class="acc-chip ${a.color}">${_dEsc(a.name)}</span>
            <div class="acc-swatches">${ACC_COLORS.map(
              (c) =>
                `<button class="acc-sw ${c}${a.color === c ? ' on' : ''}" onclick="debtSetAccColor('${a.id}','${c}')" title="${c}"></button>`
            ).join('')}</div>
            <button class="debt-icon-btn danger" onclick="debtDelAcc('${a.id}')" title="ลบ"><i class="ti ti-trash"></i></button>
          </div>`
        )
        .join('')
    : '<div class="debt-empty">ยังไม่มีบัญชี</div>';
  _debtModal(
    'จัดการ Owner (เจ้าของ)',
    `<div class="acc-list">${rows}</div>
     <div class="acc-add">
       <input type="text" id="accNewName" maxlength="24" placeholder="ชื่อบัญชีใหม่">
       <div class="acc-swatches" id="accNewSw">${ACC_COLORS.map(
         (c) => `<button class="acc-sw ${c}${c === _dPickColor ? ' on' : ''}" onclick="debtPickColor('${c}')" title="${c}"></button>`
       ).join('')}</div>
       <button class="debt-btn primary sm" onclick="debtAddAcc()"><i class="ti ti-plus"></i> เพิ่ม</button>
     </div>`,
    '',
    ''
  );
}
function debtPickColor(c) {
  _dPickColor = c;
  const sw = document.getElementById('accNewSw');
  if (sw) sw.querySelectorAll('.acc-sw').forEach((b) => b.classList.toggle('on', b.classList.contains(c)));
}
function debtAddAcc() {
  const name = (_dNv('accNewName') || '').trim();
  if (!name) return _dToast('ใส่ชื่อบัญชีก่อนนะ');
  debtState.accounts.push({ id: _dUid(), name, color: _dPickColor });
  _debtSave();
  _debtRenderAccModal();
  _debtRender();
}
function debtSetAccColor(id, c) {
  const a = _dAcc(id);
  if (!a) return;
  a.color = c;
  _debtSave();
  _debtRenderAccModal();
  _debtRender();
}
function debtDelAcc(id) {
  const a = _dAcc(id);
  if (!a) return;
  if (!confirm('ลบบัญชี "' + a.name + '"?')) return;
  debtState.accounts = debtState.accounts.filter((x) => x.id !== id);
  _debtSave();
  _debtRenderAccModal();
  _debtRender();
}

/* ═══ RENDER ══════════════════════════════════════════════════════ */
/* ── list view: metrics + accounts + debt list ───────────────────── */
function _debtMetrics() {
  const total = debtState.debts.reduce((s, d) => s + _dDebtTotal(d), 0);
  const paid = debtState.debts.reduce((s, d) => s + _dDebtPaid(d), 0);
  const remain = Math.max(0, total - paid);
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
  const cell = (ic, tone, lbl, val, valCls, sub) =>
    `<div class="ds">
       <span class="dstat-ic ${tone}">${ic}</span>
       <div class="ds-tx"><div class="ds-lbl">${lbl}</div><div class="ds-val ${valCls || ''}">${val}</div><div class="ds-sub">${sub}</div></div>
     </div>`;
  return `<div class="debt-strip debt-strip-top">
    ${cell('<i class="ti ti-report-money"></i>', 'ic-blue', 'หนี้ทั้งหมด', _dFmt(total) + ' ฿', '', debtState.debts.length + ' รายการ')}
    ${cell('<i class="ti ti-circle-check"></i>', 'ic-green', 'จ่ายแล้ว', _dFmt(paid) + ' ฿', 'green', pct + '%')}
    ${cell('<i class="ti ti-clock-dollar"></i>', 'ic-gold', 'คงเหลือ', _dFmt(remain) + ' ฿', 'red', 'ยังไม่จ่าย')}
  </div>`;
}
function _debtAccBar() {
  const chips = debtState.accounts.length
    ? debtState.accounts.map((a) => `<span class="acc-chip ${a.color}">${_dEsc(a.name)}</span>`).join('')
    : '<span class="debt-empty-inline">ยังไม่มีบัญชี — เพิ่มเพื่อใช้ตอนกรอกงวด</span>';
  return `<div class="debt-card">
    <div class="debt-card-head"><div class="debt-card-title"><i class="ti ti-users"></i> Owner (เจ้าของ/บัญชี)</div>
      <button class="debt-btn sm" onclick="debtOpenAccModal()"><i class="ti ti-settings"></i> จัดการ Owner</button></div>
    <div class="acc-bar">${chips}</div>
  </div>`;
}
function _debtListSection() {
  const rows = debtState.debts
    .map((d) => {
      const pct = _dDebtPct(d);
      const remain = _dDebtRemain(d);
      const done = (d.items || []).filter((i) => i.status === 'done').length;
      return `<div class="debt-row" onclick="debtSelect('${d.id}')">
        <span class="row-ic"><i class="ti ti-file-dollar"></i></span>
        <div class="row-main">
          <div class="row-name">${_dEsc(d.name)} <span class="acc-flow">${_dAccChip(
            d.debtor
          )}<i class="ti ti-arrow-right"></i>${_dOwnerChip(d)}</span></div>
          <div class="drow-prog"><div class="drow-track"><div class="drow-fill" style="width:${pct}%"></div></div>
            <span class="drow-pct">${pct}%</span></div>
          <div class="row-sub">${done}/${(d.items || []).length} งวด · เหลือ ${_dFmt(remain)} ฿</div>
        </div>
        <div class="drow-total">${_dFmt(_dDebtTotal(d))} ฿</div>
        <span class="chev">›</span>
      </div>`;
    })
    .join('');
  const empty = debtState.debts.length ? '' : '<div class="debt-empty">ยังไม่มีรายการหนี้</div>';
  return `<div class="debt-card">
    <div class="debt-card-head"><div class="debt-card-title"><i class="ti ti-list-details"></i> รายการหนี้ <span class="dst-sub">(กดเพื่อดูงวด)</span></div>
      <button class="debt-btn primary sm" onclick="debtOpenDebtModal()"><i class="ti ti-plus"></i> เพิ่มหนี้</button></div>
    <div class="debt-list">${rows}</div>${empty}
  </div>`;
}

/* ── detail view: one debt + installments table ──────────────────── */
function _debtItemRows(d) {
  const items = d.items || [];
  if (!items.length)
    return '<tr><td colspan="6" class="debt-empty">ยังไม่มีงวด — กด “แก้ไข” แล้วกรอกจำนวนงวด</td></tr>';
  const hasAcc = debtState.accounts.length > 0;
  const noAcc = '<span class="debt-empty-inline">— ตั้ง Owner ก่อน —</span>';
  const isCredit = d.type === 'credit';
  return items
    .map((it, idx) => {
      const st = STATUSES[it.status] || STATUSES.pending;
      const accCell = hasAcc
        ? `<select class="mo-sel debt-acc-sel" onchange="debtSetItemAcc('${it.id}',this.value)">${_dAccOptions(it.acc)}</select>`
        : noAcc;
      // ปลายทาง: บัตรเครดิต = ล็อกเป็นชื่อเจ้าหนี้ (แก้ไม่ได้) / บัญชี = dropdown
      const destCell = isCredit
        ? `<span class="acc-chip credit locked" title="แก้ที่ข้อมูลหนี้">${_dEsc(d.ownerText || '—')}</span>`
        : hasAcc
          ? `<select class="mo-sel debt-acc-sel" onchange="debtSetItemDest('${it.id}',this.value)">${_dAccOptions(it.dest)}</select>`
          : noAcc;
      const delBtn = it.manual
        ? `<button class="debt-icon-btn danger st-del" onclick="debtDelItem('${it.id}')" title="ลบงวดที่เพิ่มเอง"><i class="ti ti-trash"></i></button>`
        : '';
      return `<tr${it.manual ? ' class="mi-row"' : ''}>
        <td>${idx + 1}</td>
        <td>${_dMonthYear(it.date)}${it.manual ? ' <span class="mi-badge">เพิ่มเอง</span>' : ''}</td>
        <td class="l">${accCell}</td>
        <td class="l">${destCell}</td>
        <td class="num">${_dFmt(it.amount)}</td>
        <td class="st-cell"><button class="st-pill ${st.cls}" onclick="debtToggleStatus('${it.id}')" title="สลับสถานะ">${st.label}</button>${delBtn}</td>
      </tr>`;
    })
    .join('');
}
function _debtDetail(d) {
  const total = _dDebtTotal(d),
    paid = _dDebtPaid(d),
    remain = _dDebtRemain(d),
    pct = _dDebtPct(d);
  return `
    <button class="debt-back" onclick="debtBack()"><i class="ti ti-arrow-left"></i> รายการหนี้</button>
    <div class="debt-detail-head">
      <div class="debt-title"><i class="ti ti-file-dollar"></i> ${_dEsc(d.name)} <span class="acc-flow">${_dAccChip(
        d.debtor
      )}<i class="ti ti-arrow-right"></i>${_dOwnerChip(d)}</span></div>
      <div class="debt-head-act">
        <button class="debt-btn sm" onclick="debtOpenDebtModal('${d.id}')"><i class="ti ti-pencil"></i> แก้ไข</button>
        <button class="debt-btn danger sm" onclick="debtDelDebt('${d.id}')"><i class="ti ti-trash"></i> ลบ</button>
      </div>
    </div>
    <div class="debt-strip">
      <div class="ds"><span class="dstat-ic ic-blue"><i class="ti ti-report-money"></i></span><div class="ds-tx"><div class="ds-lbl">ยอดรวม</div><div class="ds-val">${_dFmt(total)} ฿</div><div class="ds-sub">ทั้งหมด</div></div></div>
      <div class="ds"><span class="dstat-ic ic-green"><i class="ti ti-circle-check"></i></span><div class="ds-tx"><div class="ds-lbl">จ่ายแล้ว</div><div class="ds-val green">${_dFmt(paid)} ฿</div><div class="ds-sub">${pct}%</div></div></div>
      <div class="ds"><span class="dstat-ic ic-gold"><i class="ti ti-clock-dollar"></i></span><div class="ds-tx"><div class="ds-lbl">คงเหลือ</div><div class="ds-val red">${_dFmt(remain)} ฿</div><div class="ds-sub">ยังไม่จ่าย</div></div></div>
    </div>
    <div class="debt-prog-wide"><div class="drow-track"><div class="drow-fill" style="width:${pct}%"></div></div></div>
    ${d.note ? `<div class="debt-note"><i class="ti ti-note"></i> ${_dEsc(d.note)}</div>` : ''}
    <div class="debt-card">
      <div class="debt-card-head"><div class="debt-card-title"><i class="ti ti-timeline-event"></i> งวดการจ่าย <span class="dst-sub">(กดสถานะเพื่อสลับจ่ายแล้ว/รอจ่าย)</span></div>
        <button class="debt-btn sm" onclick="debtOpenAddItemModal()"><i class="ti ti-plus"></i> เพิ่มงวด</button></div>
      <div class="debt-table-wrap"><table class="debt-table">
        <thead><tr><th>#</th><th>เดือน</th><th class="l">บัญชีต้นทาง (จ่ายจาก)</th><th class="l">บัญชีปลายทาง</th><th class="num">จำนวน</th><th>สถานะ</th></tr></thead>
        <tbody>${_debtItemRows(d)}</tbody></table></div>
    </div>`;
}

/* ── navigation ──────────────────────────────────────────────────── */
function debtSelect(id) {
  debtState.sel = id;
  debtView = 'detail';
  _debtSave();
  _debtRender();
}
function debtBack() {
  debtView = 'list';
  _debtRender();
}

function _debtRender() {
  const root = document.getElementById('debtBody');
  if (!root) return;
  const d = _debtSel();
  if (debtView === 'detail' && d) {
    root.innerHTML = _debtDetail(d);
  } else {
    debtView = 'list';
    root.innerHTML = `
      ${_debtMetrics()}
      ${_debtAccBar()}
      ${_debtListSection()}`;
  }
  if (window.moInitSelects) window.moInitSelects(root);
  if (window.moInitDatePickers) window.moInitDatePickers(root);
}

/* ── expose to global scope ──────────────────────────────────────── */
Object.assign(window, {
  _debtLoad,
  _debtRender,
  debtSelect,
  debtBack,
  debtOpenDebtModal,
  debtSetType,
  debtAddDebt,
  debtSaveDebt,
  debtDelDebt,
  debtToggleStatus,
  debtSetItemAcc,
  debtSetItemDest,
  debtOpenAddItemModal,
  debtAddManualItem,
  debtDelItem,
  debtOpenAccModal,
  debtPickColor,
  debtAddAcc,
  debtSetAccColor,
  debtDelAcc,
  debtCloseModal,
  _dDebtTotal,
  _dDebtPaid,
});
