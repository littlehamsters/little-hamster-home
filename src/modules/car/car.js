/* Car module — multi-car log: fuel + odometer, service, renewals (per car),
   driver licenses (per person). Summary metrics on top; adds via popup. */

const CAR_KEY = 'car_v1';
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
    delete renew.lic;
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

/* ── totals + nearest ────────────────────────────────────────────── */
const _carFuelTotal = (c) => (c.fuel || []).reduce((s, f) => s + _cNum(f.total), 0);
const _carServiceTotal = (c) => (c.service || []).reduce((s, r) => s + _cNum(r.cost), 0);
const _carRenewTotal = (c) =>
  RENEW_TYPES.reduce((s, t) => s + _cNum((c.renew[t.k] || {}).cost), 0);
const _carTotal = (c) => _carFuelTotal(c) + _carServiceTotal(c) + _carRenewTotal(c);

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
          <button class="car-modal-x" onclick="carCloseModal()" aria-label="ปิด">✕</button></div>
        <div class="car-modal-body">${bodyHtml}</div>
        <div class="car-modal-foot">
          <button class="car-btn" onclick="carCloseModal()">ยกเลิก</button>
          <button class="car-btn primary" onclick="${saveExpr}">${saveLabel}</button>
        </div>
      </div>
    </div>`;
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
  const c = { id: _cUid(), name, plate, fuel: [], service: [], renew: {} };
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
     <label class="cf">วันหมดอายุ<input type="date" id="carLicDue" value="${
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

/* ── fuel (popup) ────────────────────────────────────────────────── */
function carOpenFuelModal() {
  const c = _carSel();
  if (!c) return;
  _carModal(
    '⛽ เพิ่มบันทึกน้ำมัน',
    `<label class="cf">วันที่<input type="date" id="carFuelDate" value="${_cToday()}"></label>
     <label class="cf">เลขไมล์ (กม.)<input type="number" id="carFuelOdo" inputmode="numeric" placeholder="เช่น 10450"></label>
     <label class="cf">จำนวนลิตร<input type="number" id="carFuelLiters" inputmode="decimal" placeholder="เช่น 31"></label>
     <label class="cf">ราคารวม (฿)<input type="number" id="carFuelTotal" inputmode="decimal" placeholder="เช่น 1200"></label>`,
    '+ เพิ่ม',
    'carAddFuel()'
  );
}
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
  carCloseModal();
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

/* ── service (popup) ─────────────────────────────────────────────── */
function carOpenServiceModal() {
  const c = _carSel();
  if (!c) return;
  _carModal(
    '🔧 เพิ่มบันทึกซ่อม / บำรุง',
    `<label class="cf">วันที่<input type="date" id="carSvDate" value="${_cToday()}"></label>
     <label class="cf">เลขไมล์ (กม.)<input type="number" id="carSvOdo" inputmode="numeric" placeholder="เช่น 10200"></label>
     <label class="cf">รายการ<input type="text" id="carSvItem" placeholder="เช่น เปลี่ยนน้ำมันเครื่อง"></label>
     <label class="cf">ราคา (฿)<input type="number" id="carSvCost" inputmode="decimal" placeholder="เช่น 1500"></label>`,
    '+ เพิ่ม',
    'carAddService()'
  );
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
  carCloseModal();
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
  return `<div class="car-metrics top">
    <div class="car-metric"><div class="cm-lbl">🚗 รถทั้งหมด</div><div class="cm-val">${
      carState.cars.length
    } คัน</div></div>
    <div class="car-metric big"><div class="cm-lbl">💰 ค่าใช้จ่ายรวมทุกคัน</div><div class="cm-val">${_cFmt(
      total
    )} ฿</div></div>
    <div class="car-metric"><div class="cm-lbl">📄 ต่ออายุรถใกล้ครบ</div><div class="cm-val urg-${
      r.cls
    }" style="font-size:15px">${_cEsc(r.txt)}</div><div class="cm-sub urg-${r.cls}">${r.sub}</div></div>
    <div class="car-metric"><div class="cm-lbl">🪪 ใบขับขี่ใกล้หมด</div><div class="cm-val urg-${
      l.cls
    }" style="font-size:15px">${_cEsc(l.txt)}</div><div class="cm-sub urg-${l.cls}">${l.sub}</div></div>
  </div>`;
}

/* ── render: licenses + fleet ────────────────────────────────────── */
function _carLicenseSection() {
  const cards = carState.licenses
    .map((l) => {
      const u = _cUrg(l.due);
      return `<div class="car-lic ${u.cls}">
        <div class="cl-head"><span class="cl-name">👤 ${_cEsc(l.name)}</span>
          <span class="cl-act">
            <button class="car-del" onclick="carOpenLicModal('${l.id}')" title="แก้ไข">✎</button>
            <button class="car-del" onclick="carDelLicense('${l.id}')" title="ลบ">✕</button></span></div>
        <div class="cl-due">หมดอายุ: ${_cShortDate(l.due)}</div>
        <div class="cr-note ${u.cls}">${u.note}</div>
      </div>`;
    })
    .join('');
  const empty = carState.licenses.length
    ? ''
    : '<div class="car-empty">ยังไม่มีใบขับขี่</div>';
  return `<div class="car-card">
    <div class="car-card-head"><div class="car-card-title">🪪 ใบขับขี่ (รายคน)</div>
      <button class="car-btn primary sm" onclick="carOpenLicModal()">+ เพิ่มคน</button></div>
    <div class="car-lic-grid">${cards}</div>${empty}
  </div>`;
}
function _carFleetSection() {
  const cards = carState.cars
    .map((c) => {
      const nx = _carNextForCar(c);
      const u = nx ? _cUrg(nx.due) : { cls: 'none', note: 'ยังไม่ตั้งต่ออายุ' };
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
  const empty = carState.cars.length ? '' : '<div class="car-empty">ยังไม่มีรถ</div>';
  return `<div class="car-card">
    <div class="car-card-head"><div class="car-card-title">🚗 รถทั้งหมด <span class="cst-sub">(กดเพื่อดูรายละเอียด)</span></div>
      <button class="car-btn primary sm" onclick="carOpenCarModal()">+ เพิ่มรถ</button></div>
    <div class="car-ov-grid">${cards}</div>${empty}
  </div>`;
}

/* ── render: selected-car detail ─────────────────────────────────── */
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
    <div class="car-detail-head">
      <div class="car-title">🚗 ${_cEsc(c.name)}${
    c.plate ? ` <span class="cc-plate">${_cEsc(c.plate)}</span>` : ''
  }</div>
      <div class="car-head-act">
        <button class="car-btn sm" onclick="carOpenCarModal('${c.id}')">✎ แก้ไข</button>
        <button class="car-btn danger sm" onclick="carDelCar('${c.id}')">🗑 ลบ</button>
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
    <div class="car-card">
      <div class="car-card-head"><div class="car-card-title">📄 ต่อภาษี / พ.ร.บ. / ประกัน</div></div>
      <div class="car-renew-grid">${RENEW_TYPES.map((t) => _carRenewCard(c, t)).join('')}</div>
    </div>
    <div class="car-card">
      <div class="car-card-head"><div class="car-card-title">⛽ บันทึกน้ำมัน <span class="cst-sub">(คำนวณ กม./ลิตร)</span></div>
        <button class="car-btn primary sm" onclick="carOpenFuelModal()">+ เพิ่มน้ำมัน</button></div>
      <div class="car-table-wrap"><table class="car-table">
        <thead><tr><th>วันที่</th><th class="num">ไมล์</th><th class="num">ลิตร</th><th class="num">ราคา</th><th class="num">กม./ล.</th><th></th></tr></thead>
        <tbody>${_carFuelRows(c)}</tbody></table></div>
    </div>
    <div class="car-card">
      <div class="car-card-head"><div class="car-card-title">🔧 บันทึกซ่อม / บำรุงรักษา</div>
        <button class="car-btn primary sm" onclick="carOpenServiceModal()">+ เพิ่มซ่อม</button></div>
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
    ${_carSummaryMetrics()}
    <div class="car-cards-2">
      ${_carFleetSection()}
      ${_carLicenseSection()}
    </div>
    ${c ? _carDetail(c) : ''}`;
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
  carOpenFuelModal,
  carAddFuel,
  carDelFuel,
  carOpenServiceModal,
  carAddService,
  carDelService,
  carCloseModal,
  _carNextRenew,
  _carTotal,
  _cMonths,
});
