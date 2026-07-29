/* Car module — multi-car log: fuel + odometer, service, renewals, per-car spend */

const CAR_KEY = 'car_v1';
const RENEW_TYPES = [
  { k: 'tax', label: 'ภาษีรถ', icon: '🧾' },
  { k: 'act', label: 'พ.ร.บ.', icon: '🛡️' },
  { k: 'ins', label: 'ประกันภัย', icon: '📋' },
  { k: 'lic', label: 'ใบขับขี่', icon: '🪪' },
];

let carState = { cars: [], sel: '' };

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
    if (raw && Array.isArray(raw.cars)) {
      carState = raw;
    }
  } catch (e) {}
  // normalise: make sure every car has the expected shape
  carState.cars = (carState.cars || []).map((c) => ({
    id: c.id || _cUid(),
    name: c.name || 'รถของฉัน',
    plate: c.plate || '',
    fuel: Array.isArray(c.fuel) ? c.fuel : [],
    service: Array.isArray(c.service) ? c.service : [],
    renew: c.renew || {},
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
function _carFuelTotal(c) {
  return (c.fuel || []).reduce((s, f) => s + _cNum(f.total), 0);
}
function _carServiceTotal(c) {
  return (c.service || []).reduce((s, r) => s + _cNum(r.cost), 0);
}
function _carRenewTotal(c) {
  return RENEW_TYPES.reduce((s, t) => s + _cNum((c.renew[t.k] || {}).cost), 0);
}
function _carTotal(c) {
  return _carFuelTotal(c) + _carServiceTotal(c) + _carRenewTotal(c);
}
// nearest upcoming (or overdue) renewal across all cars → {label, days, plate}
function _carNextRenew() {
  let best = null;
  carState.cars.forEach((c) => {
    RENEW_TYPES.forEach((t) => {
      const due = (c.renew[t.k] || {}).due;
      const dl = _cDaysLeft(due);
      if (dl === null) return;
      if (!best || dl < best.days)
        best = { days: dl, label: t.label, name: c.name };
    });
  });
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
  if (!name) {
    _cToast('ใส่ชื่อรถก่อนนะ 🐹');
    return;
  }
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

function carAddFuel() {
  const c = _carSel();
  if (!c) return;
  const date = _cNv('carFuelDate') || _cToday();
  const odo = _cNum(_cNv('carFuelOdo'));
  const liters = _cNum(_cNv('carFuelLiters'));
  const total = _cNum(_cNv('carFuelTotal'));
  if (!liters && !total) {
    _cToast('ใส่จำนวนลิตรหรือราคาก่อน');
    return;
  }
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
  if (!item) {
    _cToast('ใส่รายการซ่อม/บำรุงก่อน');
    return;
  }
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

/* ── render ──────────────────────────────────────────────────────── */
function _carRenewCard(c, t) {
  const r = c.renew[t.k] || {};
  const dl = _cDaysLeft(r.due);
  let cls = 'ok',
    note = 'ยังไม่ตั้ง';
  if (dl !== null) {
    if (dl < 0) {
      cls = 'over';
      note = 'เลยมาแล้ว ' + Math.abs(dl) + ' วัน';
    } else if (dl <= 30) {
      cls = 'soon';
      note = 'อีก ' + dl + ' วัน';
    } else {
      cls = 'ok';
      note = 'อีก ' + dl + ' วัน';
    }
  }
  const hasCost = t.k !== 'lic';
  return `
    <div class="car-renew ${cls}">
      <div class="cr-top"><span class="cr-ic">${t.icon}</span><span class="cr-lbl">${t.label}</span></div>
      <label class="cr-field">ครบกำหนด
        <input type="date" value="${_cEsc(r.due || '')}"
          onchange="carSetRenew('${t.k}','due',this.value)">
      </label>
      ${
        hasCost
          ? `<label class="cr-field">ค่าใช้จ่าย (฿)
        <input type="number" inputmode="decimal" value="${r.cost ? _cEsc(r.cost) : ''}"
          placeholder="0" onchange="carSetRenew('${t.k}','cost',this.value)"></label>`
          : ''
      }
      <div class="cr-note ${cls}">${note}</div>
    </div>`;
}

function _carFuelRows(c) {
  const rows = (c.fuel || [])
    .slice()
    .sort((a, b) => (a.odo || 0) - (b.odo || 0));
  if (!rows.length)
    return '<tr><td colspan="6" class="car-empty">ยังไม่มีบันทึกน้ำมัน</td></tr>';
  return rows
    .map((f, i) => {
      const prev = i > 0 ? rows[i - 1] : null;
      const dist = prev && f.odo && prev.odo ? f.odo - prev.odo : 0;
      const kmL = dist && f.liters ? dist / f.liters : 0;
      const bl = f.liters ? f.total / f.liters : 0;
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
  const rows = (c.service || [])
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1));
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

function _carRender() {
  const root = document.getElementById('carBody');
  if (!root) return;

  // car selector chips
  const chips = carState.cars
    .map(
      (c) =>
        `<button class="car-chip ${c.id === carState.sel ? 'active' : ''}" onclick="carSelect('${c.id}')">
          🚗 ${_cEsc(c.name)}${c.plate ? ` <span class="cc-plate">${_cEsc(c.plate)}</span>` : ''}
        </button>`
    )
    .join('');

  const addForm = `
    <div class="car-add-inline">
      <input id="carNewName" placeholder="ชื่อรถ เช่น Yaris" maxlength="24">
      <input id="carNewPlate" placeholder="ทะเบียน (ไม่บังคับ)" maxlength="16">
      <button class="car-btn primary" onclick="carAddCar()">+ เพิ่มรถ</button>
    </div>`;

  const c = _carSel();
  if (!c) {
    root.innerHTML = `
      <div class="car-selbar">${chips}</div>
      <div class="car-empty-state">
        <div class="ces-ic">🚗</div>
        <div>ยังไม่มีรถ — เพิ่มคันแรกเลย</div>
      </div>
      ${addForm}`;
    return;
  }

  const fuelT = _carFuelTotal(c),
    svT = _carServiceTotal(c),
    rnT = _carRenewTotal(c),
    tot = fuelT + svT + rnT;

  root.innerHTML = `
    <div class="car-selbar">${chips}</div>
    ${addForm}

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
      <div class="car-metric big"><div class="cm-lbl">ค่าใช้จ่ายรวม</div><div class="cm-val">${_cFmt(tot)} ฿</div></div>
      <div class="car-metric"><div class="cm-lbl">⛽ น้ำมัน</div><div class="cm-val">${_cFmt(fuelT)} ฿</div></div>
      <div class="car-metric"><div class="cm-lbl">🔧 ซ่อม/บำรุง</div><div class="cm-val">${_cFmt(svT)} ฿</div></div>
      <div class="car-metric"><div class="cm-lbl">📄 ต่ออายุ</div><div class="cm-val">${_cFmt(rnT)} ฿</div></div>
    </div>

    <div class="car-section">
      <div class="car-sec-title">📄 ต่อภาษี / พ.ร.บ. / ประกัน / ใบขับขี่</div>
      <div class="car-renew-grid">
        ${RENEW_TYPES.map((t) => _carRenewCard(c, t)).join('')}
      </div>
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
      <div class="car-table-wrap">
        <table class="car-table">
          <thead><tr><th>วันที่</th><th class="num">ไมล์</th><th class="num">ลิตร</th><th class="num">ราคา</th><th class="num">กม./ล.</th><th></th></tr></thead>
          <tbody>${_carFuelRows(c)}</tbody>
        </table>
      </div>
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
      <div class="car-table-wrap">
        <table class="car-table">
          <thead><tr><th>วันที่</th><th class="num">ไมล์</th><th class="l">รายการ</th><th class="num">ราคา</th><th></th></tr></thead>
          <tbody>${_carServiceRows(c)}</tbody>
        </table>
      </div>
    </div>`;
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
  carAddFuel,
  carDelFuel,
  carAddService,
  carDelService,
  _carNextRenew,
  _carTotal,
});
