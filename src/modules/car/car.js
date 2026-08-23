/* Car module — multi-car log: service, renewals (per car), driver licenses
   (per person). Summary metrics on top; adds via popup. */

const CAR_KEY = 'car_v1';
const RENEW_TYPES = [
  { k: 'tax', label: 'ภาษีรถ', icon: '<i class="ti ti-receipt-2"></i>' },
  { k: 'act', label: 'พ.ร.บ.', icon: '<i class="ti ti-shield-check"></i>' },
  { k: 'ins', label: 'ประกันภัย', icon: '<i class="ti ti-file-description"></i>' },
];

let carState = { cars: [], licenses: [], sel: '' };

/* ── helpers ─────────────────────────────────────────────────────── */
const _cUid = () => 'c' + Math.random().toString(36).slice(2, 8);
const _cEsc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
const _cNum = (v) => {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  return isFinite(n) ? n : 0;
};
const _cFmt = (v) => Math.round(v).toLocaleString('th-TH');
const _cFmt1 = (v) => (Math.round(v * 10) / 10).toLocaleString('th-TH');
const _cToday = () => {
  const d = new Date();
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
};
const _cShortDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
};
const _cDaysLeft = (iso) => {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
};
// countdown shown in months; ≥ 1 year → "X ปี Y เดือน" (never days)
const _cMonths = (days) => {
  const mo = Math.round(Math.abs(days) / 30.44);
  if (mo < 1) return 'ไม่ถึง 1 เดือน';
  if (mo < 12) return mo + ' เดือน';
  const y = Math.floor(mo / 12),
    m = mo % 12;
  return y + ' ปี' + (m > 0 ? ' ' + m + ' เดือน' : '');
};
const _cUrg = (iso) => {
  const dl = _cDaysLeft(iso);
  if (dl === null) return { cls: 'none', note: 'ยังไม่ตั้ง', days: null };
  if (dl < 0) return { cls: 'over', note: 'เลยมา ' + _cMonths(dl), days: dl };
  if (dl <= 30) return { cls: 'soon', note: 'อีก ' + _cMonths(dl), days: dl };
  return { cls: 'ok', note: 'อีก ' + _cMonths(dl), days: dl };
};
const _cNv = (id) => {
  const el = document.getElementById(id);
  return el ? (el.dataset.iso != null ? el.dataset.iso : el.value) : '';
};

function _cToast(m) {
  let t = document.getElementById('_carToast');
  if (!t) {
    t = document.createElement('div');
    t.id = '_carToast';
    t.className = 'car-toast';
    document.getElementById('m-car').appendChild(t);
  }
  t.textContent = m;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2000);
}

/* ── persistence ─────────────────────────────────────────────────── */
function _carLoad() {
  try {
    const raw = JSON.parse(localStorage.getItem(CAR_KEY) || 'null');
    if (raw && Array.isArray(raw.cars)) carState = raw;
  } catch (e) {}
  carState.cars = (carState.cars || []).map((c) => {
    const renew = c.renew || {};
    delete renew.lic;
    return {
      id: c.id || _cUid(),
      name: c.name || 'รถของฉัน',
      plate: c.plate || '',
      service: Array.isArray(c.service) ? c.service : [],
      renew,
    };
  });
  carState.licenses = (carState.licenses || []).map((l) => ({
    id: l.id || _cUid(),
    name: l.name || 'ฉัน',
    due: l.due || '',
  }));
  if (!carState.sel || !carState.cars.some((c) => c.id === carState.sel)) {
    carState.sel = carState.cars[0] ? carState.cars[0].id : '';
  }
}
function _carSave() {
  try {
    localStorage.setItem(CAR_KEY, JSON.stringify(carState));
  } catch (e) {}
}
const _carSel = () => carState.cars.find((c) => c.id === carState.sel) || null;

/* ── totals + nearest ────────────────────────────────────────────── */
// a service record holds detail lines: items:[{item,cost}] (old records: single {item,cost})
const _carSvLines = (s) => (Array.isArray(s.items) && s.items.length)
  ? s.items
  : (s.item ? [{ item: s.item, cost: _cNum(s.cost) }] : []);
const _carSvRecTotal = (s) => _carSvLines(s).reduce((a, x) => a + _cNum(x.cost), 0);
const _carServiceTotal = (c) => (c.service || []).reduce((s, r) => s + _carSvRecTotal(r), 0);
const _carRenewTotal = (c) =>
  RENEW_TYPES.reduce((s, t) => s + _cNum((c.renew[t.k] || {}).cost), 0);
const _carTotal = (c) => _carServiceTotal(c) + _carRenewTotal(c);

function _carNextCarRenew() {
  let best = null;
  carState.cars.forEach((c) =>
    RENEW_TYPES.forEach((t) => {
      const due = (c.renew[t.k] || {}).due;
      const dl = _cDaysLeft(due);
      if (dl === null) return;
      if (!best || dl < best.days) best = { days: dl, label: t.label + ' · ' + c.name, due };
    })
  );
  return best;
}
function _carNextLicense() {
  let best = null;
  (carState.licenses || []).forEach((l) => {
    const dl = _cDaysLeft(l.due);
    if (dl === null) return;
    if (!best || dl < best.days) best = { days: dl, label: l.name, due: l.due };
  });
  return best;
}
// nearest of everything — used by the home dashboard card
function _carNextRenew() {
  const a = _carNextCarRenew(),
    b = _carNextLicense();
  const cand = [];
  if (a) cand.push({ days: a.days, label: a.label });
  if (b) cand.push({ days: b.days, label: 'ใบขับขี่ ' + b.label });
  if (!cand.length) return null;
  return cand.sort((x, y) => x.days - y.days)[0];
}
function _carNextForCar(c) {
  let best = null;
  RENEW_TYPES.forEach((t) => {
    const due = (c.renew[t.k] || {}).due;
    const dl = _cDaysLeft(due);
    if (dl === null) return;
    if (!best || dl < best.dl) best = { dl, due, label: t.label };
  });
  return best;
}

/* ── modal ───────────────────────────────────────────────────────── */
function _carModal(title, bodyHtml, saveLabel, saveExpr) {
  const area = document.getElementById('carModalArea');
  if (!area) return;
  area.innerHTML = `
    <div class="car-overlay show" onclick="if(event.target===this)carCloseModal()">
      <div class="car-modal">
        <div class="car-modal-head"><h3>${title}</h3>
          <button class="car-modal-x" onclick="carCloseModal()" aria-label="ปิด"><i class="ti ti-x"></i></button></div>
        <div class="car-modal-body">${bodyHtml}</div>
        <div class="car-modal-foot">
          <button class="car-btn" onclick="carCloseModal()">ยกเลิก</button>
          <button class="car-btn primary" onclick="${saveExpr}">${saveLabel}</button>
        </div>
      </div>
    </div>`;
  if (window.moInitDatePickers) window.moInitDatePickers(area);
  setTimeout(() => area.querySelector('input')?.focus(), 30);
}
function carCloseModal() {
  const a = document.getElementById('carModalArea');
  if (a) a.innerHTML = '';
}

/* ── car add / edit (popup) ──────────────────────────────────────── */
function carOpenCarModal(id) {
  const c = id ? carState.cars.find((x) => x.id === id) : null;
  _carModal(
    c ? 'แก้ไขรถ' : 'เพิ่มรถ',
    `<label class="cf">ชื่อรถ<input type="text" id="carNewName" maxlength="24" value="${
      c ? _cEsc(c.name) : ''
    }" placeholder="เช่น Yaris"></label>
     <label class="cf">ทะเบียน<input type="text" id="carNewPlate" maxlength="16" value="${
       c ? _cEsc(c.plate) : ''
     }" placeholder="ไม่บังคับ"></label>`,
    c ? 'บันทึก' : 'เพิ่มรถ',
    c ? `carSaveCar('${id}')` : 'carAddCar()'
  );
}
function carAddCar() {
  const name = (_cNv('carNewName') || '').trim();
  const plate = (_cNv('carNewPlate') || '').trim();
  if (!name) return _cToast('ใส่ชื่อรถก่อนนะ 🐹');
  const c = { id: _cUid(), name, plate, service: [], renew: {} };
  carState.cars.push(c);
  carState.sel = c.id;
  _carSave();
  carCloseModal();
  _carRender();
  _cToast('เพิ่มรถแล้ว ✓');
}
function carSaveCar(id) {
  const c = carState.cars.find((x) => x.id === id);
  if (!c) return;
  const name = (_cNv('carNewName') || '').trim();
  if (!name) return _cToast('ใส่ชื่อรถก่อนนะ');
  c.name = name;
  c.plate = (_cNv('carNewPlate') || '').trim();
  _carSave();
  carCloseModal();
  _carRender();
  _cToast('บันทึกแล้ว ✓');
}
function carDelCar(id) {
  const c = carState.cars.find((x) => x.id === id);
  if (!c) return;
  if (!confirm('ลบรถ "' + c.name + '" และประวัติทั้งหมด?')) return;
  carState.cars = carState.cars.filter((x) => x.id !== id);
  if (carState.sel === id) carState.sel = carState.cars[0]?.id || '';
  _carSave();
  _carRender();
  _cToast('ลบรถแล้ว');
}
function carSelect(id) {
  carState.sel = id;
  _carSave();
  _carRender();
}
function carSetRenew(type, field, val) {
  const c = _carSel();
  if (!c) return;
  c.renew[type] = c.renew[type] || {};
  c.renew[type][field] = field === 'cost' ? _cNum(val) : val;
  _carSave();
  _carRender();
}

/* ── license add / edit (popup) ──────────────────────────────────── */
function carOpenLicModal(id) {
  const l = id ? carState.licenses.find((x) => x.id === id) : null;
  _carModal(
    l ? 'แก้ไขใบขับขี่' : 'เพิ่มใบขับขี่',
    `<label class="cf">ชื่อคน<input type="text" id="carLicName" maxlength="24" value="${
      l ? _cEsc(l.name) : ''
    }" placeholder="เช่น โฟม / เก่ง"></label>
     <label class="cf">วันหมดอายุ<input type="date" class="mo-dp" id="carLicDue" value="${
       l ? _cEsc(l.due) : ''
     }"></label>`,
    l ? 'บันทึก' : 'เพิ่มคน',
    l ? `carSaveLicense('${id}')` : 'carAddLicense()'
  );
}
function carAddLicense() {
  const name = (_cNv('carLicName') || '').trim();
  const due = _cNv('carLicDue') || '';
  if (!name) return _cToast('ใส่ชื่อคนก่อนนะ');
  carState.licenses.push({ id: _cUid(), name, due });
  _carSave();
  carCloseModal();
  _carRender();
  _cToast('เพิ่มใบขับขี่แล้ว ✓');
}
function carSaveLicense(id) {
  const l = carState.licenses.find((x) => x.id === id);
  if (!l) return;
  const name = (_cNv('carLicName') || '').trim();
  if (!name) return _cToast('ใส่ชื่อคนก่อนนะ');
  l.name = name;
  l.due = _cNv('carLicDue') || '';
  _carSave();
  carCloseModal();
  _carRender();
  _cToast('บันทึกแล้ว ✓');
}
function carDelLicense(id) {
  carState.licenses = carState.licenses.filter((x) => x.id !== id);
  _carSave();
  _carRender();
}

/* ── service (popup) ─────────────────────────────────────────────── */
// one editable detail line in the service modal
function _carSvDetailRow(item, cost) {
  return `<div class="car-sv-row">
    <input class="car-sv-item cf-in" type="text" value="${_cEsc(item || '')}" placeholder="เช่น เปลี่ยนน้ำมันเครื่อง">
    <input class="car-sv-cost cf-in" type="number" inputmode="decimal" value="${cost ? _cEsc(cost) : ''}" placeholder="ราคา ฿" oninput="carSvUpdTotal()">
    <button type="button" class="car-del" onclick="this.closest('.car-sv-row').remove();carSvUpdTotal()" title="ลบรายการนี้"><i class="ti ti-x"></i></button>
  </div>`;
}
function carSvAddDetail() {
  const box = document.getElementById('carSvItems');
  if (!box) return;
  box.insertAdjacentHTML('beforeend', _carSvDetailRow('', ''));
  carSvUpdTotal();
  box.lastElementChild?.querySelector('.car-sv-item')?.focus();
}
function carSvUpdTotal() {
  const el = document.getElementById('carSvTotal');
  if (!el) return;
  const t = _carReadSvLines().reduce((a, x) => a + _cNum(x.cost), 0);
  el.textContent = 'รวม ' + _cFmt(t) + ' ฿';
}
// read the detail-line editor → [{item,cost}] (only lines with a name)
function _carReadSvLines() {
  return [...document.querySelectorAll('#carSvItems .car-sv-row')]
    .map((r) => ({
      item: (r.querySelector('.car-sv-item')?.value || '').trim(),
      cost: _cNum(r.querySelector('.car-sv-cost')?.value),
    }))
    .filter((x) => x.item);
}
function carOpenServiceModal(id) {
  const c = _carSel();
  if (!c) return;
  const s = id ? (c.service || []).find((x) => x.id === id) : null;
  const lines = s ? _carSvLines(s) : [];
  const rowsHtml = (lines.length ? lines : [{ item: '', cost: '' }])
    .map((x) => _carSvDetailRow(x.item, x.cost)).join('');
  _carModal(
    s ? '<i class="ti ti-tool"></i> แก้ไขบันทึกซ่อม / บำรุง' : '<i class="ti ti-tool"></i> เพิ่มบันทึกซ่อม / บำรุง',
    `<label class="cf">วันที่<input type="date" class="mo-dp" id="carSvDate" value="${s ? _cEsc(s.date) : _cToday()}"></label>
     <label class="cf">เลขไมล์ (กม.)<input type="number" id="carSvOdo" inputmode="numeric" value="${s && s.odo ? _cEsc(s.odo) : ''}" placeholder="เช่น 10200"></label>
     <div class="cf-label">รายละเอียด (ระบุราคาแยกแต่ละรายการ)</div>
     <div id="carSvItems">${rowsHtml}</div>
     <button type="button" class="car-btn sm car-sv-add" onclick="carSvAddDetail()">+ เพิ่มรายละเอียด</button>
     <div id="carSvTotal" class="car-sv-total">รวม ${_cFmt(_carSvRecTotal(s || {}))} ฿</div>`,
    s ? 'บันทึก' : '+ เพิ่ม',
    s ? `carSaveService('${id}')` : 'carAddService()'
  );
}
function carAddService() {
  const c = _carSel();
  if (!c) return;
  const items = _carReadSvLines();
  if (!items.length) return _cToast('ใส่รายการซ่อม/บำรุงอย่างน้อย 1 รายการ');
  c.service.push({ id: _cUid(), date: _cNv('carSvDate') || _cToday(), odo: _cNum(_cNv('carSvOdo')), items });
  _carSave();
  carCloseModal();
  _carRender();
  _cToast('บันทึกค่าซ่อมแล้ว ✓');
}
function carSaveService(id) {
  const c = _carSel();
  if (!c) return;
  const s = (c.service || []).find((x) => x.id === id);
  if (!s) return;
  const items = _carReadSvLines();
  if (!items.length) return _cToast('ใส่รายการซ่อม/บำรุงอย่างน้อย 1 รายการ');
  s.date = _cNv('carSvDate') || _cToday();
  s.odo = _cNum(_cNv('carSvOdo'));
  s.items = items;
  delete s.item; delete s.cost; // drop legacy single-item fields
  _carSave();
  carCloseModal();
  _carRender();
  _cToast('บันทึกแล้ว ✓');
}
function carDelService(sid) {
  const c = _carSel();
  if (!c) return;
  c.service = c.service.filter((s) => s.id !== sid);
  _carSave();
  _carRender();
}

/* ── render: summary metrics (mortgage-style) ────────────────────── */
function _carSummaryMetrics() {
  const total = carState.cars.reduce((s, c) => s + _carTotal(c), 0);
  const nc = _carNextCarRenew();
  const nl = _carNextLicense();
  const mv = (best) => {
    if (!best) return { cls: '', txt: '—', sub: 'ยังไม่ตั้ง' };
    const u = _cUrg(best.due);
    return { cls: u.cls, txt: best.label, sub: u.note };
  };
  const r = mv(nc),
    l = mv(nl);
  const yr = new Date().getFullYear() + 543;
  const cell = (ic, tone, lbl, val, valCls, sub, subCls) =>
    `<div class="cs">
       <span class="stat-ic ${tone}">${ic}</span>
       <div class="cs-tx">
         <div class="cs-lbl">${lbl}</div>
         <div class="cs-val ${valCls || ''}">${val}</div>
         <div class="cs-sub ${subCls || ''}">${sub}</div>
       </div>
     </div>`;
  return `<div class="car-strip car-strip-top">
    ${cell('<i class="ti ti-car"></i>', 'ic-green', 'รถทั้งหมด', carState.cars.length + ' คัน', '', 'กำลังใช้งาน')}
    ${cell('<i class="ti ti-cash"></i>', 'ic-gold', 'ค่าใช้จ่ายรวม', _cFmt(total) + ' ฿', 'green', 'ปี ' + yr)}
    ${cell('<i class="ti ti-shield-check"></i>', 'ic-blue', 'ต่ออายุใกล้ครบ', _cEsc(r.txt), 'sm urg-' + r.cls, r.sub, 'urg-' + r.cls)}
    ${cell('🪪', 'ic-clay', 'ใบขับขี่ใกล้หมด', _cEsc(l.txt), 'sm urg-' + l.cls, l.sub, 'urg-' + l.cls)}
  </div>`;
}

/* ── render: licenses + fleet ────────────────────────────────────── */
function _carLicenseSection() {
  const rows = carState.licenses
    .map((l) => {
      const u = _cUrg(l.due);
      return `<div class="car-row car-lic ${u.cls}">
        <span class="row-ic">👤</span>
        <div class="row-main">
          <div class="row-name">${_cEsc(l.name)}</div>
          <div class="row-sub">หมดอายุ ${_cShortDate(l.due)} · <span class="cr-note ${u.cls}">${u.note}</span></div>
        </div>
        <span class="row-act">
          <button class="car-del" onclick="carOpenLicModal('${l.id}')" title="แก้ไข"><i class="ti ti-pencil"></i></button>
          <button class="car-del" onclick="carDelLicense('${l.id}')" title="ลบ"><i class="ti ti-trash"></i></button>
        </span>
      </div>`;
    })
    .join('');
  const empty = carState.licenses.length
    ? ''
    : '<div class="car-empty">ยังไม่มีใบขับขี่</div>';
  return `<div class="car-card">
    <div class="car-card-head"><div class="car-card-title">🪪 ใบขับขี่ (รายคน)</div>
      <button class="car-btn primary sm" onclick="carOpenLicModal()">+ เพิ่มคน</button></div>
    <div class="car-list">${rows}</div>${empty}
  </div>`;
}
function _carFleetSection() {
  const rows = carState.cars
    .map((c) => {
      const nx = _carNextForCar(c);
      const u = nx ? _cUrg(nx.due) : { cls: 'none', note: 'ยังไม่ตั้งต่ออายุ' };
      const next = nx
        ? `<span class="cov-next ${u.cls}">${nx.label} · ${u.note}</span>`
        : '<span class="cov-next none">ยังไม่ตั้งต่ออายุ</span>';
      return `<div class="car-row car-ov ${c.id === carState.sel ? 'active' : ''}" onclick="carSelect('${c.id}')">
        <span class="row-ic"><i class="ti ti-car"></i></span>
        <div class="row-main">
          <div class="row-name">${_cEsc(c.name)}${
        c.plate ? ` <span class="cc-plate">${_cEsc(c.plate)}</span>` : ''
      }</div>
          <div class="row-sub">${next}</div>
        </div>
        <div class="cov-total">${_cFmt(_carTotal(c))} ฿</div>
        <span class="chev">›</span>
      </div>`;
    })
    .join('');
  const empty = carState.cars.length ? '' : '<div class="car-empty">ยังไม่มีรถ</div>';
  return `<div class="car-card">
    <div class="car-card-head"><div class="car-card-title"><i class="ti ti-car"></i> รถทั้งหมด <span class="cst-sub">(กดเพื่อดูรายละเอียด)</span></div>
      <button class="car-btn primary sm" onclick="carOpenCarModal()">+ เพิ่มรถ</button></div>
    <div class="car-list">${rows}</div>${empty}
  </div>`;
}

/* ── render: selected-car detail ─────────────────────────────────── */
function _carRenewCard(c, t) {
  const r = c.renew[t.k] || {};
  const u = _cUrg(r.due);
  return `<div class="car-renew">
    <div class="cr-head">
      <span class="cr-ic">${t.icon}</span>
      <span class="cr-lbl">${t.label}</span>
      <span class="cr-note pill ${u.cls}">${u.note}</span>
    </div>
    <div class="cr-fields">
      <label class="cr-field"><span>ครบกำหนด</span>
        <input type="date" class="mo-dp" value="${_cEsc(r.due || '')}" onchange="carSetRenew('${t.k}','due',window.moGetDate(this))"></label>
      <label class="cr-field"><span>ค่าใช้จ่าย (฿)</span>
        <input type="number" inputmode="decimal" value="${r.cost ? _cEsc(r.cost) : ''}" placeholder="0" onchange="carSetRenew('${t.k}','cost',this.value)"></label>
    </div>
  </div>`;
}
function _carServiceRows(c) {
  const rows = (c.service || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!rows.length)
    return '<tr><td colspan="5" class="car-empty">ยังไม่มีบันทึกซ่อม/บำรุง</td></tr>';
  return rows
    .map((s) => {
      const lines = _carSvLines(s);
      const bullets = lines.length
        ? `<ul class="car-sv-list">${lines.map((x) =>
            `<li><span class="car-sv-name">${_cEsc(x.item)}</span>${
              _cNum(x.cost) ? `<span class="car-sv-price">${_cFmt(x.cost)} ฿</span>` : ''}</li>`).join('')}</ul>`
        : '—';
      return `<tr>
      <td>${_cShortDate(s.date)}</td>
      <td class="num">${s.odo ? _cFmt(s.odo) : '—'}</td>
      <td class="l">${bullets}</td>
      <td class="num">${_carSvRecTotal(s) ? _cFmt(_carSvRecTotal(s)) : '—'}</td>
      <td class="row-act">
        <button class="car-del" onclick="carOpenServiceModal('${s.id}')" title="แก้ไข"><i class="ti ti-pencil"></i></button>
        <button class="car-del" onclick="carDelService('${s.id}')" title="ลบ"><i class="ti ti-trash"></i></button>
      </td>
    </tr>`;
    })
    .join('');
}
function _carDetail(c) {
  const svT = _carServiceTotal(c),
    rnT = _carRenewTotal(c);
  return `
    <div class="car-detail-head">
      <div class="car-title"><i class="ti ti-car"></i> ${_cEsc(c.name)}${
    c.plate ? ` <span class="cc-plate">${_cEsc(c.plate)}</span>` : ''
  }</div>
      <div class="car-head-act">
        <button class="car-btn sm" onclick="carOpenCarModal('${c.id}')"><i class="ti ti-pencil"></i> แก้ไข</button>
        <button class="car-btn danger sm" onclick="carDelCar('${c.id}')"><i class="ti ti-trash"></i> ลบ</button>
      </div>
    </div>
    <div class="car-strip">
      <div class="cs"><span class="stat-ic ic-green"><i class="ti ti-cash"></i></span><div class="cs-tx"><div class="cs-lbl">ค่าใช้จ่ายรวม</div><div class="cs-val green">${_cFmt(
        svT + rnT
      )} ฿</div><div class="cs-sub">ปี ${new Date().getFullYear() + 543}</div></div></div>
      <div class="cs"><span class="stat-ic ic-blue"><i class="ti ti-tool"></i></span><div class="cs-tx"><div class="cs-lbl">ซ่อม/บำรุง</div><div class="cs-val">${_cFmt(svT)} ฿</div><div class="cs-sub">${(c.service || []).length} ครั้ง</div></div></div>
      <div class="cs"><span class="stat-ic ic-gold"><i class="ti ti-file-invoice"></i></span><div class="cs-tx"><div class="cs-lbl">ต่ออายุ</div><div class="cs-val">${_cFmt(rnT)} ฿</div><div class="cs-sub">รวมทั้งหมด</div></div></div>
    </div>
    <div class="car-card">
      <div class="car-card-head"><div class="car-card-title"><i class="ti ti-file-invoice"></i> ต่อภาษี / พ.ร.บ. / ประกัน</div></div>
      <div class="car-list">${RENEW_TYPES.map((t) => _carRenewCard(c, t)).join('')}</div>
    </div>
    <div class="car-card">
      <div class="car-card-head"><div class="car-card-title"><i class="ti ti-tool"></i> บันทึกซ่อม / บำรุงรักษา</div>
        <div class="car-sv-tools">
          <div class="car-search"><i class="ti ti-search"></i><input type="text" id="carSvSearch" placeholder="ค้นหารายการ..." oninput="carFilterService()"></div>
          <button class="car-btn primary sm" onclick="carOpenServiceModal()"><i class="ti ti-plus"></i> เพิ่มซ่อม</button>
        </div></div>
      <div class="car-table-wrap"><table class="car-table" id="carSvTable">
        <thead><tr><th>วันที่</th><th class="num">ไมล์</th><th class="l">รายการ</th><th class="num">ราคา</th><th></th></tr></thead>
        <tbody>${_carServiceRows(c)}</tbody></table></div>
    </div>`;
}

function carFilterService() {
  const el = document.getElementById('carSvSearch');
  const q = (el ? el.value : '').trim().toLowerCase();
  const t = document.getElementById('carSvTable');
  if (!t) return;
  let shown = 0;
  t.querySelectorAll('tbody tr').forEach((tr) => {
    if (tr.querySelector('.car-empty')) return;
    const hit = !q || tr.textContent.toLowerCase().includes(q);
    tr.style.display = hit ? '' : 'none';
    if (hit) shown++;
  });
  let none = t.querySelector('.car-sv-none');
  if (q && shown === 0) {
    if (!none) {
      none = document.createElement('tr');
      none.className = 'car-sv-none';
      none.innerHTML = '<td colspan="5" class="car-empty">ไม่พบรายการที่ค้นหา</td>';
      t.querySelector('tbody').appendChild(none);
    }
    none.style.display = '';
  } else if (none) {
    none.style.display = 'none';
  }
}
function _carRender() {
  const root = document.getElementById('carBody');
  if (!root) return;
  const c = _carSel();
  root.innerHTML = `
    ${_carSummaryMetrics()}
    <div class="car-cards-2">
      ${_carFleetSection()}
      ${_carLicenseSection()}
    </div>
    ${c ? _carDetail(c) : ''}`;
  if (window.moInitDatePickers) window.moInitDatePickers(root);
}

/* ── expose to global scope (inline handlers + registry) ─────────── */
Object.assign(window, {
  _carLoad,
  _carRender,
  carSelect,
  carOpenCarModal,
  carAddCar,
  carSaveCar,
  carDelCar,
  carSetRenew,
  carOpenLicModal,
  carAddLicense,
  carSaveLicense,
  carDelLicense,
  carOpenServiceModal,
  carAddService,
  carSaveService,
  carDelService,
  carFilterService,
  carSvAddDetail,
  carSvUpdTotal,
  carCloseModal,
  _carNextRenew,
  _carTotal,
  _cMonths,
});
