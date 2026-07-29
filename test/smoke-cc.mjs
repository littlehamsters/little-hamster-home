// CC statement-import — Phase 0 helpers (deriveCC / ccCategoryTotals)
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto(process.env.SMOKE_URL || 'http://localhost:8090/', { waitUntil: 'load' });
await page.waitForTimeout(1200);

const out = await page.evaluate(() => {
  const r = {};
  r.helpers = ['deriveCC', 'ccCategoryTotals'].every(n => typeof window[n] === 'function');
  r.categories = Array.isArray(window.CC_CATEGORIES) ? window.CC_CATEGORIES.length : 0;
  r.owners = Array.isArray(window.CC_OWNERS) ? window.CC_OWNERS.map(o => o.v).join(',') : '';

  // sample = the 5 rows from the real statement (total 1,413.66)
  const txns = [
    { amt: 527.0,   owner: 'common', category: 'กิน' },
    { amt: 301.67,  owner: 'p1',     category: 'ของใช้' },
    { amt: 199.0,   owner: 'common', category: 'กิน' },
    { amt: 130.35,  owner: 'p2',     category: 'กิน' },
    { amt: 255.64,  owner: 'other',  category: 'อื่นๆ' },
  ];
  r.derived = window.deriveCC(txns);
  r.remainder = +(r.derived.total - r.derived.p1 - r.derived.p2 - r.derived.other).toFixed(2);
  r.cats = window.ccCategoryTotals(txns);
  return r;
});

const round = (v) => +Number(v).toFixed(2);
const ok = c => c ? '✓' : '✗';
console.log('=== CC IMPORT — Phase 0 helpers ===');
console.log('  helpers exposed :', ok(out.helpers));
console.log('  categories (6)  :', ok(out.categories === 6), out.categories);
console.log('  owners          :', ok(out.owners === 'p1,p2,common,other'), out.owners);
console.log('  deriveCC total  :', out.derived.total, ok(round(out.derived.total) === 1413.66));
console.log('  deriveCC p1     :', out.derived.p1, ok(round(out.derived.p1) === 301.67));
console.log('  deriveCC p2     :', out.derived.p2, ok(round(out.derived.p2) === 130.35));
console.log('  deriveCC other  :', out.derived.other, ok(round(out.derived.other) === 255.64));
console.log('  common remainder:', out.remainder, ok(out.remainder === 726));
console.log('  cat กิน (856.35):', round(out.cats['กิน']), ok(round(out.cats['กิน']) === 856.35));
console.log('  cat ของใช้      :', round(out.cats['ของใช้']), ok(round(out.cats['ของใช้']) === 301.67));
// ── Phase 1: review-table modal → save into month cc entry ──────────
const p1 = await page.evaluate(() => {
  const r = {};
  window.showModule('budget');
  window.ccImportOpen();
  r.modalOpen = document.getElementById('cc-import-modal').classList.contains('open');
  r.cardOptions = document.getElementById('cci-card').options.length; // 1 placeholder + cards
  window.ccImportAddRow();
  window.ccImportAddRow(); // total 3 rows
  const ids = [...document.querySelectorAll('#cci-rows [onclick^="ccImportDelRow"]')]
    .map(b => b.getAttribute('onclick').match(/'([^']+)'/)[1]);
  r.rowCount = ids.length;
  const set = (i, amt, owner, cat) => {
    window.ccImportField(ids[i], 'amt', amt);
    window.ccImportField(ids[i], 'owner', owner);
    window.ccImportField(ids[i], 'category', cat);
  };
  set(0, '527', 'common', 'กิน');
  set(1, '301.67', 'p1', 'ของใช้');
  set(2, '255.64', 'other', 'อื่นๆ');
  r.summaryText = document.getElementById('cci-summary').textContent.replace(/\s+/g, ' ').trim().slice(0, 60);
  const sel = document.getElementById('cci-card');
  sel.value = sel.options[1].value;
  const before = (window.getMD().cc || []).length;
  window.ccImportSave();
  const cc = window.getMD().cc;
  const last = cc[cc.length - 1];
  r.saved = cc.length === before + 1;
  r.total = last.total; r.p1 = last.p1; r.other = last.other; r.txns = (last.txns || []).length;
  r.common = +(last.total - last.p1 - last.p2 - last.other).toFixed(2);
  r.modalClosed = !document.getElementById('cc-import-modal').classList.contains('open');
  return r;
});
const rnd = v => +Number(v).toFixed(2);
console.log('=== CC IMPORT — Phase 1 review table ===');
console.log('  modal opens     :', ok(p1.modalOpen));
console.log('  card options    :', ok(p1.cardOptions > 1), p1.cardOptions);
console.log('  3 rows          :', ok(p1.rowCount === 3), p1.rowCount);
console.log('  summary         :', p1.summaryText);
console.log('  saved to cc     :', ok(p1.saved));
console.log('  total 1,084.31  :', ok(rnd(p1.total) === 1084.31), p1.total);
console.log('  p1 301.67       :', ok(rnd(p1.p1) === 301.67), p1.p1);
console.log('  other 255.64    :', ok(rnd(p1.other) === 255.64), p1.other);
console.log('  common 527      :', ok(p1.common === 527), p1.common);
console.log('  txns stored (3) :', ok(p1.txns === 3), p1.txns);
console.log('  modal closed    :', ok(p1.modalClosed));

// ── Phase 2: OCR parser (Tesseract download not exercised headlessly) ──
const p2 = await page.evaluate(() => {
  const r = {};
  r.parserExposed = typeof window._cciParseOCR === 'function' && typeof window.ccImportPhoto === 'function';
  r.ocrBtn = !!document.getElementById('cci-file') &&
    !!document.querySelector('#cci-photo [onclick*="cci-file"]');
  const ocrText = [
    '22/06/26 23/06/26 TOPS-PIN KLAO BANGKOK THA 527.00',
    '27/06/26 28/06/26 OFFICE MATE (THAI) - WEST GATE 301.67',
    '29/06/26 30/06/26 TOPS-PIN KLAO BANGKOK THA 199.00',
    '07/07/26 08/07/26 TOPS-WESTGATE 1 NONTHABURI THA 130.35',
    '12/07/26 13/07/26 TOPS-WESTGATE 1 NONTHABURI THA 255.64',
    'SUBTOTAL FOR 5256 67XX XXXX 5568 (TANAWAT LUKKANAPINIJ) 1,413.66',
    'ยอดรวมรายการใช้จ่าย / Transaction Amount 1,413.66',
  ].join('\n');
  const rows = window._cciParseOCR(ocrText);
  r.count = rows.length;
  r.sum = +rows.reduce((s, t) => s + parseFloat(t.amt), 0).toFixed(2);
  r.firstMerchant = rows[0] ? rows[0].merchant : '';
  r.firstDate = rows[0] ? rows[0].date : '';
  return r;
});
console.log('=== CC IMPORT — Phase 2 OCR parser ===');
console.log('  parser+photo exposed:', ok(p2.parserExposed));
console.log('  OCR button present  :', ok(p2.ocrBtn));
console.log('  parsed 5 rows       :', ok(p2.count === 5), p2.count);
console.log('  sum = 1,413.66      :', ok(p2.sum === 1413.66), p2.sum);
console.log('  first merchant      :', ok(/TOPS-PIN KLAO/.test(p2.firstMerchant)), p2.firstMerchant);
console.log('  first date          :', ok(p2.firstDate === '22/06/26'), p2.firstDate);

console.log('=== ERRORS ===');
console.log(errors.length ? errors.join('\n') : '  none ✓');
await browser.close();
