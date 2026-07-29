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

// baht/plus-prefixed amount (no decimals), e.g. "+ ฿868", "฿99", "+868"
const BAHT = /[+฿]\s*[^\d\n]{0,3}[\d,]+(?:\.\d{1,2})?/g;
const amtFromBaht = (tok) => tok.replace(/[^\d.,]/g, '');
// a line that is essentially just a date (BNPL puts the date on its own line)
const isDateOnly = (line) => {
  if (!reDate().test(line)) return false;
  // remove dates + any leftover year digits + punctuation → nothing meaningful left
  const rest = line.replace(reDate(), ' ').replace(/\b\d{2,4}\b/g, ' ').replace(/[^a-zก-๙]+/gi, '').trim();
  return !rest;
};
// OCR text → transaction rows. Supports two layouts:
//  - bank statement: date + description + amount(.dd) on one line
//  - BNPL / ช้อปก่อนจ่ายทีหลัง: "name … + ฿868" then the date on the next line
export function parseOCR(text, idFn = _defaultId) {
  const lines = (text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const out = [];
  let pendingDesc = '';
  let last = null; // last created row (to attach a trailing date-only line)
  for (const line of lines) {
    if (SKIP.test(line)) { pendingDesc = ''; continue; }
    // amount: prefer decimal (bank), else ฿/+ integer (BNPL)
    const dec = line.match(MONEY);
    const baht = dec ? null : line.match(BAHT);
    let raw = dec ? dec[dec.length - 1] : (baht ? amtFromBaht(baht[baht.length - 1]) : null);
    let amt = raw ? parseFloat(raw.replace(/,/g, '')) : 0;
    if (amt) {
      if (CREDIT.test(line) || /[\d,]+\.\d{2}\s*cr\b/i.test(line) || /[-(]\s*[\d,]+\.\d{2}\s*\)?\s*$/.test(line)) {
        amt = -Math.abs(amt);
      }
      const dm = line.match(reDate());
      let mer = line.replace(MONEY, ' ').replace(BAHT, ' ').replace(reDate(), ' ')
        .replace(/[฿+]/g, ' ').replace(/\s{2,}/g, ' ').trim();
      if (!mer && pendingDesc) mer = pendingDesc;
      last = { id: idFn(), date: dm ? dm[0] : '', merchant: mer || '(รายการ)', amt: String(amt), owner: 'common', category: '', note: '' };
      out.push(last);
      pendingDesc = '';
    } else if (isDateOnly(line) && last && !last.date) {
      last.date = line.match(reDate())[0]; // BNPL: date on the line after the item
    } else if (/[a-zก-๙]{2,}/i.test(line)) {
      pendingDesc = line;
    }
  }
  return out;
}
