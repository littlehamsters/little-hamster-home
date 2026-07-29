/* Credit-card statement-import — pure logic (no DOM / cfg), unit-testable.
   Imported by budget.js; covered by test/cc-utils.test.mjs. */

export const CC_CATEGORIES = ['กิน', 'ของใช้', 'เดินทาง', 'บันเทิง', 'บิล/ค่าบริการ', 'อื่นๆ'];

// number parser: keeps digits, dot and minus (so credits/refunds stay negative)
export function num(v) {
  return Math.round((parseFloat(String(v).replace(/[^0-9.\-]/g, '')) || 0) * 100) / 100;
}

// txn = {amt, owner:'p1'|'p2'|'common'|'other', category, ...}
// → the card split {total,p1,p2,other}; 'common' is the remainder (split 50/50 downstream)
export function deriveCC(txns) {
  let total = 0, p1 = 0, p2 = 0, other = 0;
  (txns || []).forEach((t) => {
    const a = num(t.amt);
    total += a;
    if (t.owner === 'p1') p1 += a;
    else if (t.owner === 'p2') p2 += a;
    else if (t.owner === 'other') other += a;
  });
  return { total, p1, p2, other };
}

// totals grouped by category → { 'กิน': 123, ... }
export function ccCategoryTotals(txns) {
  const out = {};
  (txns || []).forEach((t) => {
    const cat = t.category || 'อื่นๆ';
    out[cat] = (out[cat] || 0) + num(t.amt);
  });
  return out;
}

const MONTH = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|ม\\.?ค|ก\\.?พ|มี\\.?ค|เม\\.?ย|พ\\.?ค|มิ\\.?ย|ก\\.?ค|ส\\.?ค|ก\\.?ย|ต\\.?ค|พ\\.?ย|ธ\\.?ค';
const MONEY = /\d{1,3}(?:,\d{3})*\.\d{2}/g;
const reDate = () => new RegExp('\\d{1,2}[\\/.\\-]\\d{1,2}[\\/.\\-]\\d{2,4}|\\d{1,2}\\s?(?:' + MONTH + ')\\.?', 'gi');
const SKIP = /subtotal|transaction amount|posting date|description|installment|statement|credit limit|available|minimum|ยอดรวม|ยอดชำระ|ยอดยกมา|ผ่อนชำระ|วันที่ทำรายการ|จำนวนเงิน/i;
const CREDIT = /cashback|cash back|เงินคืน|คืนเงิน|refund|reversal|เครดิตเงินคืน|credit voucher/i;

let _seq = 0;
const _defaultId = () => 'x' + (++_seq).toString(36);

// group merchants by first brand-ish word (ignore dates / order-ids / branch)
export function merchKey(m) {
  const s = (m || '').toLowerCase().replace(reDate(), ' ');
  const t = s.match(/[a-zก-๙]{2,}/);
  return t ? t[0] : '';
}

// OCR text → transaction rows. Amount anywhere on the line, date optional,
// amount-only lines pair with the previous description; credits become negative.
export function parseOCR(text, idFn = _defaultId) {
  const lines = (text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const out = [];
  let pendingDesc = '';
  for (const line of lines) {
    if (SKIP.test(line)) { pendingDesc = ''; continue; }
    const amts = line.match(MONEY);
    if (amts && amts.length) {
      let amt = parseFloat(amts[amts.length - 1].replace(/,/g, ''));
      if (!amt) continue;
      if (CREDIT.test(line) || /[\d,]+\.\d{2}\s*cr\b/i.test(line) || /[-(]\s*[\d,]+\.\d{2}\s*\)?\s*$/.test(line)) {
        amt = -Math.abs(amt);
      }
      const dm = line.match(reDate());
      let mer = line.replace(MONEY, ' ').replace(reDate(), ' ').replace(/\s{2,}/g, ' ').trim();
      if (!mer && pendingDesc) mer = pendingDesc;
      out.push({ id: idFn(), date: dm ? dm[0] : '', merchant: mer || '(รายการ)', amt: String(amt), owner: 'common', category: '', note: '' });
      pendingDesc = '';
    } else if (/[a-zก-๙]{2,}/i.test(line)) {
      pendingDesc = line;
    }
  }
  return out;
}
