import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto(process.env.SMOKE_URL || 'http://localhost:8090/', { waitUntil: 'load' });
await page.waitForTimeout(1200);

const res = await page.evaluate(async () => {
  const out = {};

  // ---- BACKUP: capture the JSON without downloading ----
  const origCreate = URL.createObjectURL;
  let captured = null;
  URL.createObjectURL = (blob) => { captured = blob; return 'blob:stub'; };
  const origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function(){};
  localStorage.setItem('mortgage_real_v5', '{"loanAmt":1000}');
  localStorage.setItem('savings_jars_v1', '{"funds":[]}');
  localStorage.setItem('bp3_months', '{}');
  localStorage.setItem('salaryTaxPlanner_v2', '{"people":[]}');
  window.unifiedBackup();
  const text = await captured.text();
  URL.createObjectURL = origCreate;
  HTMLAnchorElement.prototype.click = origClick;
  const payload = JSON.parse(text);
  out.backupVersion = payload.version;
  out.backupKeys = Object.keys(payload.data).sort();

  // ---- RESTORE v2 (new generic format) ----
  localStorage.clear();
  const v2 = { version:2, data:{ mortgage_real_v5:'{"x":2}', bp3_theme:'dark' } };
  const f2 = new File([JSON.stringify(v2)], 'b.json', {type:'application/json'});
  window.unifiedRestore(f2);
  await new Promise(r=>setTimeout(r,300));
  out.v2_mortgage = localStorage.getItem('mortgage_real_v5');
  out.v2_theme = localStorage.getItem('bp3_theme');

  // ---- RESTORE v1 (legacy format) ----
  localStorage.clear();
  const v1 = { version:1, budget:{months:'{"m":1}',cfg:'{"c":1}',theme:'light'},
               mortgage:'{"mo":1}', savings:'{"sv":1}', salary:'{"sa":1}' };
  const f1 = new File([JSON.stringify(v1)], 'old.json', {type:'application/json'});
  window.unifiedRestore(f1);
  await new Promise(r=>setTimeout(r,300));
  out.v1_months = localStorage.getItem('bp3_months');
  out.v1_mortgage = localStorage.getItem('mortgage_real_v5');
  out.v1_savings = localStorage.getItem('savings_jars_v1');
  out.v1_salary = localStorage.getItem('salaryTaxPlanner_v2');
  out.v1_theme = localStorage.getItem('bp3_theme');
  return out;
});

const EXPECT_KEYS = ['bp3_cfg','bp3_months','bp3_theme','mortgage_real_v5','salaryTaxPlanner_v2','savings_jars_v1'];
const ok = (c) => c ? '✓' : '✗';
console.log('=== BACKUP (v2 generic) ===');
console.log('  version 2:', ok(res.backupVersion===2), res.backupVersion);
console.log('  SYNC_KEYS complete:', ok(JSON.stringify(res.backupKeys)===JSON.stringify(EXPECT_KEYS)));
console.log('   got:', res.backupKeys.join(', '));
console.log('=== RESTORE v2 (new) ===');
console.log('  mortgage:', ok(res.v2_mortgage==='{"x":2}'), '| theme:', ok(res.v2_theme==='dark'));
console.log('=== RESTORE v1 (legacy backward-compat) ===');
console.log('  months:', ok(res.v1_months==='{"m":1}'), '| mortgage:', ok(res.v1_mortgage==='{"mo":1}'),
            '| savings:', ok(res.v1_savings==='{"sv":1}'), '| salary:', ok(res.v1_salary==='{"sa":1}'),
            '| theme:', ok(res.v1_theme==='light'));
console.log('=== ERRORS ===');
console.log(errors.length ? errors.join('\n') : '  none ✓');
await browser.close();
