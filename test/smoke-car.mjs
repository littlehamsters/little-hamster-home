import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (/error|uncaught|not defined|cannot read/i.test(m.text())) errors.push('[console] ' + m.text()); });
await page.goto(process.env.SMOKE_URL || 'http://localhost:8090/', { waitUntil: 'load' });
await page.waitForTimeout(1200);

const out = await page.evaluate(() => {
  const r = {};
  r.handlers = ['carOpenCarModal','carAddCar','carSaveCar','carSelect',
    'carOpenServiceModal','carAddService','carSaveService','carDelService','carSetRenew',
    'carOpenLicModal','carAddLicense','carSaveLicense','carDelLicense','carCloseModal','_carLoad','_carRender']
    .every(n => typeof window[n] === 'function');

  // empty: add buttons exist; popup opens with a form input
  localStorage.removeItem('car_v1');
  window.showModule('car');
  r.moduleVisible = getComputedStyle(document.getElementById('m-car')).display;
  r.addCarBtn = [...document.querySelectorAll('#m-car [onclick]')].some(b => /carOpenCarModal\(\)/.test(b.getAttribute('onclick')));
  window.carOpenCarModal();
  r.carPopupOpens = document.querySelector('#m-car .car-overlay.show') && !!document.getElementById('carNewName');
  window.carCloseModal();
  r.popupCloses = !document.querySelector('#m-car .car-overlay.show');

  // seed data
  const iso = d => d.toISOString().slice(0,10);
  const t = new Date();
  const plus = n => { const x = new Date(t); x.setDate(x.getDate()+n); return iso(x); };
  localStorage.setItem('car_v1', JSON.stringify({
    sel:'car1',
    licenses:[ {id:'l1',name:'โฟม',due:plus(-3)}, {id:'l2',name:'เก่ง',due:plus(400)} ],
    cars:[{
      id:'car1', name:'Yaris', plate:'1กก1234',
      service:[ {id:'s1',date:plus(-20),odo:10200,item:'เปลี่ยนน้ำมันเครื่อง',cost:1500} ],
      renew:{ tax:{due:plus(15),cost:2000}, act:{due:plus(-5),cost:650}, ins:{due:plus(200),cost:12000} }
    },{ id:'car2', name:'Vios', plate:'2ขข5678', service:[], renew:{} }]
  }));
  window._carLoad(); window._carRender();

  // top summary metrics (mortgage-style)
  const topMetrics = document.querySelectorAll('#m-car .car-strip-top .cs');
  r.topMetricCount = topMetrics.length;
  r.summaryTotal = document.querySelector('#m-car .car-strip-top .cs-val.green')?.textContent;

  r.fleetCards = document.querySelectorAll('#m-car .car-ov').length;
  r.licCards = document.querySelectorAll('#m-car .car-lic').length;
  r.licOverdue = !!document.querySelector('#m-car .car-lic.over');
  r.renewCards = document.querySelectorAll('#m-car .car-renew').length;
  // countdown must be in months, never days
  const noteTxt = [...document.querySelectorAll('#m-car .cr-note, #m-car .cov-next, #m-car .cm-sub')]
    .map(e => e.textContent).join(' | ');
  r.usesMonths = /เดือน/.test(noteTxt);
  r.hasDays = /\d+\s*วัน/.test(noteTxt);
  // เก่ง's license is +400 days → ~13 months → "1 ปี 1 เดือน"
  r.hasYears = [...document.querySelectorAll('#m-car .car-lic .cr-note')]
    .some(e => /ปี/.test(e.textContent));
  r.sampleNote = noteTxt.slice(0, 90);
  // service table (fuel section removed): 1 existing row
  const svTable = document.querySelector('#m-car .car-table');
  r.svRows = svTable.querySelectorAll('tbody tr').length;

  // POPUP FLOW: add a service record via the modal → 1→2 rows
  window.carOpenServiceModal();
  r.svPopup = !!document.getElementById('carSvItem');
  document.getElementById('carSvDate').value = '2026-05-20';
  document.getElementById('carSvItem').value = 'เปลี่ยนยาง';
  document.getElementById('carSvCost').value = '4000';
  window.carAddService();
  r.svAddedRows = document.querySelector('#m-car .car-table').querySelectorAll('tbody tr').length;
  r.popupClosedAfterAdd = !document.querySelector('#m-car .car-overlay.show');

  // EDIT FLOW: each service row has ✎ (edit) + ✕ (delete)
  const svActs = document.querySelectorAll('#m-car .car-table tbody tr .car-del');
  r.svRowHasEditDel = svActs.length >= 2 &&
    /carOpenServiceModal\(/.test(svActs[0].getAttribute('onclick')) &&
    /carDelService\(/.test(svActs[1].getAttribute('onclick'));
  // open edit on first service, change cost, save → value updates
  const editBtn = [...document.querySelectorAll('#m-car .car-table tbody tr .car-del')]
    .find(b => /carOpenServiceModal\('/.test(b.getAttribute('onclick')));
  editBtn.click();
  r.editPrefilled = !!document.getElementById('carSvItem')?.value;
  document.getElementById('carSvCost').value = '9999';
  const sid = editBtn.getAttribute('onclick').match(/carOpenServiceModal\('([^']+)'\)/)[1];
  window.carSaveService(sid);
  r.editApplied = [...document.querySelectorAll('#m-car .car-table tbody tr')]
    .some(tr => /9,999/.test(tr.textContent));

  // dashboard
  window.showModule('home'); window.loadDash();
  r.dashTotal = document.getElementById('car-total')?.textContent;
  r.dashCount = document.getElementById('car-count')?.textContent;
  r.dashNext = document.getElementById('car-next')?.textContent;
  return r;
});

const ok = c => c ? '✓' : '✗';
console.log('=== CAR MODULE ===');
console.log('  handlers exposed  :', ok(out.handlers));
console.log('  module visible    :', ok(out.moduleVisible==='block'));
console.log('  + เพิ่มรถ button   :', ok(out.addCarBtn));
console.log('  car popup opens   :', ok(out.carPopupOpens));
console.log('  popup closes      :', ok(out.popupCloses));
console.log('  top summary metrics:', ok(out.topMetricCount===4), out.topMetricCount, '| total:', out.summaryTotal);
console.log('  fleet overview    :', ok(out.fleetCards===2), out.fleetCards);
console.log('  license cards     :', ok(out.licCards===2), out.licCards, '| overdue:', ok(out.licOverdue));
console.log('  renew cards       :', ok(out.renewCards===3), out.renewCards);
console.log('  countdown = months:', ok(out.usesMonths && !out.hasDays), '|', out.sampleNote);
console.log('  >1yr shows ปี     :', ok(out.hasYears));
console.log('  service rows      :', ok(out.svRows===1), out.svRows);
console.log('=== POPUP ADD FLOW ===');
console.log('  service popup opens:', ok(out.svPopup));
console.log('  row added (1→2)   :', ok(out.svAddedRows===2), out.svAddedRows);
console.log('  popup auto-closed :', ok(out.popupClosedAfterAdd));
console.log('  service ✎+✕ buttons:', ok(out.svRowHasEditDel));
console.log('  edit prefilled    :', ok(out.editPrefilled));
console.log('  edit saved (9,999):', ok(out.editApplied));
console.log('=== DASHBOARD CARD ===');
console.log('  total:', out.dashTotal, '| count:', out.dashCount, ok(out.dashCount==='2 คัน'), '| next:', out.dashNext);
console.log('=== ERRORS ===');
console.log(errors.length ? errors.join('\n') : '  none ✓');
await browser.close();
