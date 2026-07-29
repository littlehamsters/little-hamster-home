// Regression: savings' dynamically-generated buttons (ฝาก/ถอน/ประวัติ) call
// window.* functions — all of the engine's handlers must be exposed.
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto(process.env.SMOKE_URL || 'http://localhost:8090/', { waitUntil: 'load' });
await page.waitForTimeout(1200);

const out = await page.evaluate(() => {
  const r = {};
  r.missing = ['openTx','openHist','delTx','openFund','reopenFund','pickCat','pickEmoji',
    'removePerson','saveTx','saveFund','openAssets','addPerson','setSeg','setCatFilter']
    .filter(n => typeof window[n] !== 'function');

  localStorage.setItem('savings_jars_v1', JSON.stringify({
    funds:[{id:'f1',name:'ทริป',emoji:'🎯',cat:'goal',owner:'กองกลาง',goal:1000,closed:false,
      tx:[{id:'t1',type:'in',amt:500,ts:Date.now()}]}], people:['กองกลาง'], seg:'all' }));
  window.showModule('savings'); window._svLoad(); window._svRender();

  const onclicks = [...document.querySelectorAll('#m-savings [onclick]')]
    .map(b => b.getAttribute('onclick'));
  r.depositBtn = onclicks.some(o => /openTx\(/.test(o));
  r.historyBtn = onclicks.some(o => /openHist\(/.test(o));

  try { window.openTx('f1','in'); r.txModal = document.getElementById('txOverlay')?.classList.contains('show'); }
  catch (e) { r.txModal = 'ERR:' + e.message; }
  try { window.openHist('f1'); r.histModal = document.getElementById('histOverlay')?.classList.contains('show'); }
  catch (e) { r.histModal = 'ERR:' + e.message; }
  return r;
});

const ok = c => c === true ? '✓' : '✗';
console.log('=== SAVINGS BUTTONS (ฝาก/ถอน/ประวัติ) ===');
console.log('  all handlers on window :', out.missing.length ? '✗ missing ' + out.missing.join(',') : '✓');
console.log('  deposit button present :', ok(out.depositBtn));
console.log('  history button present :', ok(out.historyBtn));
console.log('  openTx opens modal     :', ok(out.txModal), out.txModal === true ? '' : out.txModal);
console.log('  openHist opens modal   :', ok(out.histModal), out.histModal === true ? '' : out.histModal);
console.log('=== ERRORS ===');
console.log(errors.length ? errors.join('\n') : '  none ✓');
await browser.close();
