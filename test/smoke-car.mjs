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
  r.handlers = ['carOpenCarModal','carAddCar','carSaveCar','carSelect','carOpenFuelModal','carAddFuel',
    'carOpenServiceModal','carAddService','carSetRenew','carOpenLicModal','carAddLicense','carSaveLicense',
    'carDelLicense','carCloseModal','_carLoad','_carRender']
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
      fuel:[ {id:'f1',date:plus(-30),odo:10000,liters:30,total:1200},
             {id:'f2',date:plus(-10),odo:10450,liters:31,total:1240} ],
      service:[ {id:'s1',date:plus(-20),odo:10200,item:'เปลี่ยนน้ำมันเครื่อง',cost:1500} ],
      renew:{ tax:{due:plus(15),cost:2000}, act:{due:plus(-5),cost:650}, ins:{due:plus(200),cost:12000} }
    },{ id:'car2', name:'Vios', plate:'2ขข5678', fuel:[], service:[], renew:{} }]
  }));
  window._carLoad(); window._carRender();

  // top summary metrics (mortgage-style)
  const topMetrics = document.querySelectorAll('#m-car .car-metrics.top .car-metric');
  r.topMetricCount = topMetrics.length;
  r.summaryTotal = document.querySelector('#m-car .car-metrics.top .car-metric.big .cm-val')?.textContent;

  r.fleetCards = document.querySelectorAll('#m-car .car-ov').length;
  r.licCards = document.querySelectorAll('#m-car .car-lic').length;
  r.licOverdue = !!document.querySelector('#m-car .car-lic.over');
  r.renewCards = document.querySelectorAll('#m-car .car-renew').length;
  const tables = [...document.querySelectorAll('#m-car .car-table')];
  r.fuelRows = tables[0].querySelectorAll('tbody tr').length;
  r.kmL = tables[0].querySelectorAll('tbody tr:first-child td')[4]?.textContent;

  // POPUP FLOW: add a fuel record via the modal
  window.carOpenFuelModal();
  r.fuelPopup = !!document.getElementById('carFuelOdo');
  document.getElementById('carFuelDate').value = plus(-1);
  document.getElementById('carFuelOdo').value = '10900';
  document.getElementById('carFuelLiters').value = '30';
  document.getElementById('carFuelTotal').value = '1150';
  window.carAddFuel();
  r.fuelAddedRows = document.querySelectorAll('#m-car .car-table')[0].querySelectorAll('tbody tr').length;
  r.popupClosedAfterAdd = !document.querySelector('#m-car .car-overlay.show');

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
console.log('  fuel rows / km/L  :', ok(out.fuelRows===2), out.fuelRows, '/', out.kmL);
console.log('=== POPUP ADD FLOW ===');
console.log('  fuel popup opens  :', ok(out.fuelPopup));
console.log('  row added (2→3)   :', ok(out.fuelAddedRows===3), out.fuelAddedRows);
console.log('  popup auto-closed :', ok(out.popupClosedAfterAdd));
console.log('=== DASHBOARD CARD ===');
console.log('  total:', out.dashTotal, '| count:', out.dashCount, ok(out.dashCount==='2 คัน'), '| next:', out.dashNext);
console.log('=== ERRORS ===');
console.log(errors.length ? errors.join('\n') : '  none ✓');
await browser.close();
