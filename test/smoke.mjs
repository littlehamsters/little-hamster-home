import { chromium } from 'playwright';

const URL = process.env.SMOKE_URL || 'http://localhost:5173/';
const browser = await chromium.launch();
const page = await browser.newPage();

const errors = [];
const logs = [];
page.on('console', m => { logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(2500); // let modules init + firebase boot

// 1) critical globals present
const globals = await page.evaluate(() => {
  const names = ['showModule','loadDash','_moLoad','_svLoad','_svRender','_bpLoad',
    '_bpRender','recalc','fbSignIn','fbSignOut','stInit','stReloadFromStorage',
    'stGetHomeSummary','openFund','openTx','addRow','changeMonth','unifiedBackup'];
  const out = {};
  names.forEach(n => out[n] = typeof window[n]);
  return out;
});

// 2) firebase login screen shown (not authed)?
const fbScreen = await page.evaluate(() => {
  const el = document.getElementById('fb-screen');
  return el ? getComputedStyle(el).display : 'no-element';
});

// 3) try navigating to each module (calls showModule + its loaders)
const navResult = await page.evaluate(() => {
  const res = {};
  for (const m of ['mortgage','savings','budget','salary','home']) {
    try {
      window.showModule(m);
      const el = document.getElementById('m-' + m);
      res[m] = el ? getComputedStyle(el).display : 'missing';
    } catch (e) { res[m] = 'ERROR: ' + e.message; }
  }
  return res;
});

await page.waitForTimeout(500);

console.log('=== GLOBALS (expect "function") ===');
for (const [k,v] of Object.entries(globals)) console.log(`  ${v==='function'?'✓':'✗'} ${k}: ${v}`);
console.log('\n=== FB LOGIN SCREEN display ===\n  ', fbScreen, '(expect "flex")');
console.log('\n=== MODULE NAV (expect block, home=block) ===');
for (const [k,v] of Object.entries(navResult)) console.log(`  ${k}: ${v}`);
console.log('\n=== PAGE ERRORS ===');
console.log(errors.length ? errors.join('\n') : '  none ✓');
console.log('\n=== console errors/warnings (filtered) ===');
const noisy = logs.filter(l => /error|uncaught|is not defined|cannot read/i.test(l));
console.log(noisy.length ? noisy.slice(0,20).join('\n') : '  no error-level logs ✓');

await browser.close();
