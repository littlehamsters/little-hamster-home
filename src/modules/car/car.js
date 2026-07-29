/* Car module — multi-car log: fuel + odometer, service, renewals (per car),
   driver licenses (per person), with a summary at the top. */

const CAR_KEY = 'car_v1';
// per-car renewals (driver license is per-person, handled separately)
const RENEW_TYPES = [
  { k: 'tax', label: 'ภาษีรถ', icon: '🧾' },
  { k: 'act', label: 'พ.ร.บ.', icon: '🛡️' },
  { k: 'ins', label: 'ประกันภัย', icon: '📋' },
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
  return d.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
};
const _cDaysLeft = (iso) => {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
};
// urgency class + human note from a due date
const _cUrg = (iso) => {
  const dl = _cDaysLeft(iso);
  if (dl === null) return { cls: 'none', note: 'ยังไม่ตั้ง', days: null };
  if (dl < 0) return { cls: 'over', note: 'เลยมา ' + Math.abs(dl) + ' วัน', days: dl };
  if (dl <= 30) return { cls: 'soon', note: 'อีก ' + dl + ' วัน', days: dl };
  return { cls: 'ok', note: 'อีก ' + dl + ' วัน', days: dl };
};
const _cNv = (id) => {
  const el = document.getElementById(id);
  return el ? el.value : '';
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
    delete renew.lic; // license is no longer per-car
    return {
      id: c.id || _cUid(),
      name: c.name || 'รถของฉัน',
      plate: c.plate || '',
      fuel: Array.isArray(c.fuel) ? c.fuel : [],
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

/* ── totals ──────────────────────────────────────────────────────── */
const _carFuelTotal = (c) => (c.fuel || []).reduce((s, f) => s + _cNum(f.total), 0);
const _carServiceTotal = (c) => (c.service || []).reduce((s, r) => s + _cNum(r.cost), 0);
const _carRenewTotal = (c) =>
  RENEW_TYPES.reduce((s, t) => s + _cNum((c.renew[t.k] || {}).cost), 0);
const _carTotal = (c) => _carFuelTotal(c) + _carServiceTotal(c) + _carRenewTotal(c);

// nearest renewal for one car (tax/act/ins) → {label, days} | null
function _carCarNext(c) {
  let best = null;
  RENEW_TYPES.forEach((t) => {
    const dl = _cDaysLeft((c.renew[t.k] || {}).due);
    if (dl === null) return;
    if (!best || dl < best.days) best = { days: dl, label: t.label };
  });
  return best;
}
// nearest of everything (cars + licenses) for the home dashboard card
function _carNextRenew() {
  let best = null;
  const consider = (dl, label) => {
    if (dl === null) return;
    if (!best || dl < best.days) best = { days: dl, label };
  };
  carState.cars.forEach((c) =>
    RENEW_TYPES.forEach((t) =>
      consider(_cDaysLeft((c.renew[t.k] || {}).due), t.label)
    )
  );
  (carState.licenses || []).forEach((l) =>
    consider(_cDaysLeft(l.due), 'ใบขับขี่ ' + l.name)
  );
  return best;
}

/* ── actions (exposed to window for inline onclick) ──────────────── */
function carSelect(id) {
  carState.sel = id;
  _carSave();
  _carRender();
}

function carAddCar() {
  const name = (_cNv('carNewName') || '').trim();
  const plate = (_cNv('carNewPlate') || '').trim();
  if (!name) return _cToast('ใส่ชื่อรถก่อนนะ 🐹');
  const c = { id: _cUid(), name, plate, fuel: [], service: [], renew: {} };
  carState.cars.push(c);
  carState.sel = c.id;
  _carSave();
  _carRender();
  _cToast('เพิ่มรถแล้ว ✓');
}
function carRenameCar(id) {
  const c = carState.cars.find((x) => x.id === id);
  if (!c) return;
  const name = prompt('ชื่อรถ:', c.name);
  if (name === null) return;
  const plate = prompt('ทะเบียน:', c.plate || '');
  c.name = (name || '').trim() || c.name;
  if (plate !== null) c.plate = plate.trim();
  _carSave();
  _carRender();
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
function carSetRenew(type, field, val) {
  const c = _carSel();
  if (!c) return;
  c.renew[type] = c.renew[type] || {};
  c.renew[type][field] = field === 'cost' ? _cNum(val) : val;
  _carSave();
  _carRender();
}

/* driver licenses (per person) */
function carAddLicense() {
  const name = (_cNv('carLicName') || '').trim();
  const due = _cNv('carLicDue') || '';
  if (!name) return _cToast('ใส่ชื่อคนก่อนนะ');
  carState.licenses.push({ id: _cUid(), name, due });
  _carSave();
  _carRender();
  _cToast('เพิ่มใบขับขี่แล้ว ✓');
}
function carSetLicense(id, field, val) {
  const l = carState.licenses.find((x) => x.id === id);
  if (!l) return;
  l[field] = val;
  _carSave();
  _carRender();
}
function carDelLicense(id) {
  carState.licenses = carState.licenses.filter((x) => x.id !== id);
  _carSave();
  _carRender();
}

/* fuel + service */
function carAddFuel() {
  const c = _carSel();
  if (!c) return;
  const date = _cNv('carFuelDate') || _cToday();
  const odo = _cNum(_cNv('carFuelOdo'));
  const liters = _cNum(_cNv('carFuelLiters'));
  const total = _cNum(_cNv('carFuelTotal'));
  if (!liters && !total) return _cToast('ใส่จำนวนลิตรหรือราคาก่อน');
  c.fuel.push({ id: _cUid(), date, odo, liters, total });
  _carSave();
  _carRender();
  _cToast('บันทึกน้ำมันแล้ว ✓');
}
function carDelFuel(fid) {
  const c = _carSel();
  if (!c) return;
  c.fuel = c.fuel.filter((f) => f.id !== fid);
  _carSave();
  _carRender();
}
function carAddService() {
  const c = _carSel();
  if (!c) return;
  const date = _cNv('carSvDate') || _cToday();
  const odo = _cNum(_cNv('carSvOdo'));
  const item = (_cNv('carSvItem') || '').trim();
  const cost = _cNum(_cNv('carSvCost'));
  if (!item) return _cToast('ใส่รายการซ่อม/บำรุงก่อน');
  c.service.push({ id: _cUid(), date, odo, item, cost });
  _carSave();
  _carRender();
  _cToast('บันทึกค่าซ่อมแล้ว ✓');
}
function carDelService(sid) {
  const c = _carSel();
  if (!c) return;
  c.service = c.service.filter((s) => s.id !== sid);
  _carSave();
  _carRender();
}

/* ── render: summary (top) ───────────────────────────────────────── */
function _carLicenseSummary() {
  const cards = carState.licenses
    .map((l) => {
      const u = _cUrg(l.due);
      return `<div class="car-lic ${u.cls}">
        <div class="cl-head"><span class="cl-name">👤 ${_cEsc(l.name)}</span>
          <button class="car-del" onclick="carDelLicense('${l.id}')" title="ลบ">✕</button></div>
        <label class="cr-field">หมดอายุ
          <input type="date" value="${_cEsc(l.due)}" onchange="carSetLicense('${l.id}','due',this.value)"></label>
        <div class="cr-note ${u.cls}">${u.note}</div>
      </div>`;
    })
    .join('');
  const empty = carState.licenses.length
    ? ''
    : '<div class="car-empty">ยังไม่มีใบขับขี่ — เพิ่มด้านล่าง</div>';
  return `<div class="car-section">
    <div class="car-sec-title">🪪 ใบขับขี่ (รายคน)</div>
    <div class="car-lic-grid">${cards}</div>${empty}
    <div class="car-add-row">
      <input type="text" id="carLicName" placeholder="ชื่อ เช่น โฟม / เก่ง" maxlength="24">
      <input type="date" id="carLicDue">
      <button class="car-btn primary" onclick="carAddLicense()">+ เพิ่มคน</button>
    </div>
  </div>`;
}

function _carFleetSummary() {
  const cards = carState.cars
    .map((c) => {
      const nx = _carCarNext(c);
      const u = _cUrg(_findNextDue(c));
      const next = nx
        ? `<span class="cov-next ${u.cls}">${nx.label} · ${u.note}</span>`
        : '<span class="cov-next none">ยังไม่ตั้งต่ออายุ</span>';
      return `<div class="car-ov ${c.id === carState.sel ? 'active' : ''}" onclick="carSelect('${c.id}')">
        <div class="cov-name">🚗 ${_cEsc(c.name)}${
        c.plate ? ` <span class="cc-plate">${_cEsc(c.plate)}</span>` : ''
      }</div>
        <div class="cov-total">${_cFmt(_carTotal(c))} ฿</div>
        <div class="cov-line">${next}</div>
      </div>`;
    })
    .join('');
  const empty = carState.cars.length
    ? ''
    : '<div class="car-empty">ยังไม่มีรถ — เพิ่มด้านล่าง</div>';
  return `<div class="car-section">
    <div class="car-sec-title">🚗 รถทั้งหมด <span class="cst-sub">(กดเพื่อดู/แก้รายละเอียด)</span></div>
    <div class="car-ov-grid">${cards}</div>${empty}
    <div class="car-add-inline">
      <input type="text" id="carNewName" placeholder="ชื่อรถ เช่น Yaris" maxlength="24">
      <input type="text" id="carNewPlate" placeholder="ทะเบียน (ไม่บังคับ)" maxlength="16">
      <button class="car-btn primary" onclick="carAddCar()">+ เพิ่มรถ</button>
    </div>
  </div>`;
}
// nearest-due iso for a car (for the overview urgency colour)
function _findNextDue(c) {
  let best = null;
  RENEW_TYPES.forEach((t) => {
    const due = (c.renew[t.k] || {}).due;
    const dl = _cDaysLeft(due);
    if (dl === null) return;
    if (!best || dl < best.dl) best = { dl, due };
  });
  return best ? best.due : '';
}

/* ── render: renewals / fuel / service (per selected car) ────────── */
function _carRenewCard(c, t) {
  const r = c.renew[t.k] || {};
  const u = _cUrg(r.due);
  return `<div class="car-renew ${u.cls}">
    <div class="cr-top"><span class="cr-ic">${t.icon}</span><span class="cr-lbl">${t.label}</span></div>
    <label class="cr-field">ครบกำหนด
      <input type="date" value="${_cEsc(r.due || '')}" onchange="carSetRenew('${t.k}','due',this.value)"></label>
    <label class="cr-field">ค่าใช้จ่าย (฿)
      <input type="number" inputmode="decimal" value="${r.cost ? _cEsc(r.cost) : ''}" placeholder="0"
        onchange="carSetRenew('${t.k}','cost',this.value)"></label>
    <div class="cr-note ${u.cls}">${u.note}</div>
  </div>`;
}
function _carFuelRows(c) {
  const rows = (c.fuel || []).slice().sort((a, b) => (a.odo || 0) - (b.odo || 0));
  if (!rows.length)
    return '<tr><td colspan="6" class="car-empty">ยังไม่มีบันทึกน้ำมัน</td></tr>';
  return rows
    .map((f, i) => {
      const prev = i > 0 ? rows[i - 1] : null;
      const dist = prev && f.odo && prev.odo ? f.odo - prev.odo : 0;
      const kmL = dist && f.liters ? dist / f.liters : 0;
      return `<tr>
        <td>${_cShortDate(f.date)}</td>
        <td class="num">${f.odo ? _cFmt(f.odo) : '—'}</td>
        <td class="num">${f.liters ? _cFmt1(f.liters) : '—'}</td>
        <td class="num">${f.total ? _cFmt(f.total) : '—'}</td>
        <td class="num">${kmL ? _cFmt1(kmL) : '—'}</td>
        <td><button class="car-del" onclick="carDelFuel('${f.id}')" title="ลบ">✕</button></td>
      </tr>`;
    })
    .reverse()
    .join('');
}
function _carServiceRows(c) {
  const rows = (c.service || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!rows.length)
    return '<tr><td colspan="5" class="car-empty">ยังไม่มีบันทึกซ่อม/บำรุง</td></tr>';
  return rows
    .map(
      (s) => `<tr>
      <td>${_cShortDate(s.date)}</td>
      <td class="num">${s.odo ? _cFmt(s.odo) : '—'}</td>
      <td class="l">${_cEsc(s.item)}</td>
      <td class="num">${s.cost ? _cFmt(s.cost) : '—'}</td>
      <td><button class="car-del" onclick="carDelService('${s.id}')" title="ลบ">✕</button></td>
    </tr>`
    )
    .join('');
}

function _carDetail(c) {
  const fuelT = _carFuelTotal(c),
    svT = _carServiceTotal(c),
    rnT = _carRenewTotal(c);
  return `
    <div class="car-head">
      <div class="car-title">🚗 ${_cEsc(c.name)}${
    c.plate ? ` <span class="cc-plate">${_cEsc(c.plate)}</span>` : ''
  }</div>
      <div class="car-head-act">
        <button class="car-btn" onclick="carRenameCar('${c.id}')">✎ แก้ไข</button>
        <button class="car-btn danger" onclick="carDelCar('${c.id}')">🗑 ลบ</button>
      </div>
    </div>
    <div class="car-metrics">
      <div class="car-metric big"><div class="cm-lbl">ค่าใช้จ่ายรวม</div><div class="cm-val">${_cFmt(
        fuelT + svT + rnT
      )} ฿</div></div>
      <div class="car-metric"><div class="cm-lbl">⛽ น้ำมัน</div><div class="cm-val">${_cFmt(fuelT)} ฿</div></div>
      <div class="car-metric"><div class="cm-lbl">🔧 ซ่อม/บำรุง</div><div class="cm-val">${_cFmt(svT)} ฿</div></div>
      <div class="car-metric"><div class="cm-lbl">📄 ต่ออายุ</div><div class="cm-val">${_cFmt(rnT)} ฿</div></div>
    </div>
    <div class="car-section">
      <div class="car-sec-title">📄 ต่อภาษี / พ.ร.บ. / ประกัน</div>
      <div class="car-renew-grid">${RENEW_TYPES.map((t) => _carRenewCard(c, t)).join('')}</div>
    </div>
    <div class="car-section">
      <div class="car-sec-title">⛽ บันทึกน้ำมัน <span class="cst-sub">(เลขไมล์ช่วยคำนวณ กม./ลิตร)</span></div>
      <div class="car-add-row">
        <input type="date" id="carFuelDate" value="${_cToday()}">
        <input type="number" id="carFuelOdo" inputmode="numeric" placeholder="เลขไมล์">
        <input type="number" id="carFuelLiters" inputmode="decimal" placeholder="ลิตร">
        <input type="number" id="carFuelTotal" inputmode="decimal" placeholder="ราคา ฿">
        <button class="car-btn primary" onclick="carAddFuel()">+ เพิ่ม</button>
      </div>
      <div class="car-table-wrap"><table class="car-table">
        <thead><tr><th>วันที่</th><th class="num">ไมล์</th><th class="num">ลิตร</th><th class="num">ราคา</th><th class="num">กม./ล.</th><th></th></tr></thead>
        <tbody>${_carFuelRows(c)}</tbody></table></div>
    </div>
    <div class="car-section">
      <div class="car-sec-title">🔧 บันทึกซ่อม / บำรุงรักษา</div>
      <div class="car-add-row">
        <input type="date" id="carSvDate" value="${_cToday()}">
        <input type="number" id="carSvOdo" inputmode="numeric" placeholder="เลขไมล์">
        <input type="text" id="carSvItem" placeholder="รายการ เช่น เปลี่ยนน้ำมันเครื่อง">
        <input type="number" id="carSvCost" inputmode="decimal" placeholder="ราคา ฿">
        <button class="car-btn primary" onclick="carAddService()">+ เพิ่ม</button>
      </div>
      <div class="car-table-wrap"><table class="car-table">
        <thead><tr><th>วันที่</th><th class="num">ไมล์</th><th class="l">รายการ</th><th class="num">ราคา</th><th></th></tr></thead>
        <tbody>${_carServiceRows(c)}</tbody></table></div>
    </div>`;
}

function _carRender() {
  const root = document.getElementById('carBody');
  if (!root) return;
  const c = _carSel();
  root.innerHTML = `
    <div class="car-summary">
      ${_carLicenseSummary()}
      ${_carFleetSummary()}
    </div>
    ${c ? `<div class="car-detail-head">รายละเอียดรถ</div>${_carDetail(c)}` : ''}`;
}

/* ── expose to global scope (inline handlers + registry) ─────────── */
Object.assign(window, {
  _carLoad,
  _carRender,
  carSelect,
  carAddCar,
  carRenameCar,
  carDelCar,
  carSetRenew,
  carAddLicense,
  carSetLicense,
  carDelLicense,
  carAddFuel,
  carDelFuel,
  carAddService,
  carDelService,
  _carNextRenew,
  _carTotal,
});
