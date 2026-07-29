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
  // 1) handlers exposed
  r.handlers = ['carAddCar','carSelect','carAddFuel','carAddService','carSetRenew','carDelCar',
    'carAddLicense','carSetLicense','carDelLicense','_carLoad','_carRender']
    .every(n => typeof window[n] === 'function');

  // 2) open module — empty state
  localStorage.removeItem('car_v1');
  window.showModule('car');
  r.moduleVisible = getComputedStyle(document.getElementById('m-car')).display;
  // usable-when-empty: summary shows add-car + add-license forms even with no data
  r.emptyUsable = !!document.getElementById('carNewName') && !!document.getElementById('carLicName');

  // 3) seed a car with fuel + service + renewals (near + overdue)
  const today = new Date();
  const iso = d => d.toISOString().slice(0,10);
  const plus = n => { const x = new Date(today); x.setDate(x.getDate()+n); return iso(x); };
  localStorage.setItem('car_v1', JSON.stringify({
    sel:'car1',
    licenses:[ {id:'l1',name:'โฟม',due:plus(-3)}, {id:'l2',name:'เก่ง',due:plus(400)} ],
    cars:[{
      id:'car1', name:'Yaris', plate:'1กก1234',
      fuel:[ {id:'f1',date:plus(-30),odo:10000,liters:30,total:1200},
             {id:'f2',date:plus(-10),odo:10450,liters:31,total:1240} ],
      service:[ {id:'s1',date:plus(-20),odo:10200,item:'เปลี่ยนน้ำมันเครื่อง',cost:1500} ],
      renew:{ tax:{due:plus(15),cost:2000}, act:{due:plus(-5),cost:650}, ins:{due:plus(200),cost:12000} }
    },{
      id:'car2', name:'Vios', plate:'2ขข5678', fuel:[], service:[], renew:{}
    }]
  }));
  window._carLoad(); window._carRender();

  const tables = [...document.querySelectorAll('#m-car .car-table')];
  r.fleetCards = document.querySelectorAll('#m-car .car-ov').length;
  r.licCards = document.querySelectorAll('#m-car .car-lic').length;
  r.licOverdue = !!document.querySelector('#m-car .car-lic.over'); // โฟม overdue
  r.metricTotal = document.querySelector('#m-car .car-metric.big .cm-val')?.textContent;
  r.fuelRows = tables[0].querySelectorAll('tbody tr').length;
  r.renewCards = document.querySelectorAll('#m-car .car-renew').length;
  r.overdue = !!document.querySelector('#m-car .car-renew.over'); // พรบ overdue
  r.kmL = (() => { // 450km / 31L ≈ 14.5 on the newest fuel row (top after reverse)
    const cells = tables[0].querySelectorAll('tbody tr:first-child td');
    return cells.length ? cells[4].textContent : null;
  })();

  // 4) dashboard card
  window.showModule('home'); window.loadDash();
  r.dashTotal = document.getElementById('car-total')?.textContent;
  r.dashCount = document.getElementById('car-count')?.textContent;
  r.dashNext = document.getElementById('car-next')?.textContent;
  return r;
});

const ok = c => c ? '✓' : '✗';
console.log('=== CAR MODULE ===');
console.log('  handlers exposed :', ok(out.handlers));
console.log('  module visible   :', ok(out.moduleVisible==='block'), out.moduleVisible);
console.log('  usable when empty:', ok(out.emptyUsable));
console.log('  fleet overview   :', ok(out.fleetCards===2), out.fleetCards, 'cars');
console.log('  license cards    :', ok(out.licCards===2), out.licCards, 'people');
console.log('  license overdue  :', ok(out.licOverdue), '(โฟม)');
console.log('  total metric     :', out.metricTotal, ok(!!out.metricTotal));
console.log('  fuel rows        :', ok(out.fuelRows===2), out.fuelRows);
console.log('  renew cards      :', ok(out.renewCards===3), out.renewCards, '(tax/พรบ/ประกัน)');
console.log('  พรบ overdue flag :', ok(out.overdue));
console.log('  km/L computed    :', out.kmL);
console.log('=== DASHBOARD CARD ===');
console.log('  total :', out.dashTotal, '| count:', out.dashCount, ok(out.dashCount==='2 คัน'), '| next:', out.dashNext);
console.log('=== ERRORS ===');
console.log(errors.length ? errors.join('\n') : '  none ✓');
await browser.close();
