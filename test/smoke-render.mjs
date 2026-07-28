import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (/error|uncaught|not defined|cannot read/i.test(m.text())) errors.push('[console] '+m.text()); });

await page.goto(process.env.SMOKE_URL || 'http://localhost:8090/', { waitUntil: 'load' });
await page.waitForTimeout(1500);

const out = await page.evaluate(() => {
  const r = {};
  // MORTGAGE: uses DEFAULT_DATA fallback → render table
  window.showModule('mortgage');
  r.mortgageRows = document.querySelectorAll('#m-mortgage tbody tr').length;
  r.mortgagePaidChip = document.getElementById('mo-paid')?.textContent?.trim();

  // SAVINGS: seed a fund then render
  localStorage.setItem('savings_jars_v1', JSON.stringify({
    funds:[{id:'f1',name:'ทดสอบ',emoji:'🎯',cat:'goal',owner:'กองกลาง',goal:1000,closed:false,
      tx:[{id:'t1',type:'in',amt:500,ts:Date.now()}]}], people:['กองกลาง'], seg:'all'
  }));
  window._svLoad(); window._svRender();
  r.savingsCards = document.querySelectorAll('#m-savings .jar, #m-savings [class*="jar"]').length;

  // BUDGET
  window.showModule('budget');
  r.budgetRendered = !!document.querySelector('#m-budget .month-label')?.textContent;

  // SALARY
  window.showModule('salary');
  r.salaryTable = document.querySelectorAll('#stIncomeBody tr').length;

  // DASHBOARD
  window.showModule('home'); window.loadDash();
  r.dashMoPct = document.getElementById('mo-pct')?.textContent?.trim();
  r.dashSvTotal = document.getElementById('sv-total')?.textContent?.trim();
  return r;
});

console.log('=== RENDER PIPELINE ===');
console.log('  mortgage table rows :', out.mortgageRows, out.mortgageRows>0?'✓':'✗');
console.log('  mortgage paid chip  :', out.mortgagePaidChip);
console.log('  savings jar cards   :', out.savingsCards, out.savingsCards>0?'✓':'✗');
console.log('  budget month label  :', out.budgetRendered?'✓ rendered':'✗ empty');
console.log('  salary income rows  :', out.salaryTable, out.salaryTable===12?'✓ (12 months)':'(expect 12)');
console.log('  dashboard mo %      :', out.dashMoPct);
console.log('  dashboard sv total  :', out.dashSvTotal);
console.log('\n=== ERRORS ===');
console.log(errors.length ? errors.join('\n') : '  none ✓');
await browser.close();
