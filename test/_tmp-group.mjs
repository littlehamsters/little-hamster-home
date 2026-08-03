import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('CON:'+m.text());});
await page.goto('http://localhost:8090/',{waitUntil:'load'});
await page.waitForTimeout(2500);

// seed: same-named items across p1 and p2 (ค่าบ้าน both) + prefixed extras
const res = await page.evaluate(()=>{
  window.showModule('budget'); window._bpLoad();
  // fixed ค่าบ้าน exists for both p1(fe_1) and p2(fe_9)
  window.setFixedExpense('p1','fe_1','actual',6200);
  window.setFixedExpense('p2','fe_9','actual',6000);
  // add prefixed extras: "ค่าหมอ ทั่วไป" p1, "ค่าหมอ ฟัน" p2
  document.getElementById('extra-exp-name-p1') && (()=>{
    document.getElementById('extra-exp-name-p1').value='ค่าหมอ ทั่วไป';
    document.getElementById('extra-exp-actual-p1').value='800';
    window.addExtraExpense('p1');
    document.getElementById('extra-exp-name-p2').value='ค่าหมอ ฟัน';
    document.getElementById('extra-exp-actual-p2').value='1200';
    window.addExtraExpense('p2');
  })();
  window._bpRender();
  // open chart panel and switch to group tab
  window.toggleChart();
  const btn=document.getElementById('cp5');
  window.setChartTab('group',btn);
  // read the group table
  const box=document.getElementById('group-container');
  const rows=[...box.querySelectorAll('tbody tr')].map(tr=>tr.textContent.replace(/\s+/g,' ').trim());
  const foot=box.querySelector('tfoot tr')?.textContent.replace(/\s+/g,' ').trim();
  const groupPrefixTests={
    a:window._groupPrefix('ค่าบ้าน โฟม'),
    b:window._groupPrefix('ค่าหมอ ฟัน'),
    c:window._groupPrefix('ค่าบ้าน'),
    d:window._groupPrefix('ค่า internet+mobile'),
  };
  return {rows,foot,groupPrefixTests};
});
console.log('prefix fn:', JSON.stringify(res.groupPrefixTests));
console.log('--- group table rows ---');
res.rows.forEach(r=>console.log('  ', r));
console.log('FOOTER:', res.foot);
console.log('ERRORS:', errors.length?errors:'none');
await browser.close();
