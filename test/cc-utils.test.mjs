// Unit tests for pure CC statement-import logic (no browser).
// Run: npm run test:unit   (node --test)
import test from 'node:test';
import assert from 'node:assert/strict';
import { num, deriveCC, ccCategoryTotals, parseOCR, merchKey, CC_CATEGORIES } from '../src/modules/budget/cc-utils.js';

test('num parses thai-formatted, keeps negatives', () => {
  assert.equal(num('1,413.66'), 1413.66);
  assert.equal(num('527.00'), 527);
  assert.equal(num('-50.00'), -50);
  assert.equal(num('฿ 12,000'), 12000);
  assert.equal(num(''), 0);
  assert.equal(num('abc'), 0);
});

test('deriveCC splits by owner; common = remainder', () => {
  const txns = [
    { amt: 527, owner: 'common' },
    { amt: 301.67, owner: 'p1' },
    { amt: 130.35, owner: 'p2' },
    { amt: 255.64, owner: 'other' },
  ];
  const d = deriveCC(txns);
  assert.equal(round(d.total), 1214.66);
  assert.equal(round(d.p1), 301.67);
  assert.equal(round(d.p2), 130.35);
  assert.equal(round(d.other), 255.64);
  assert.equal(round(d.total - d.p1 - d.p2 - d.other), 527); // common remainder
});

test('deriveCC nets cashback (negative amounts)', () => {
  const d = deriveCC([{ amt: 527, owner: 'common' }, { amt: -50, owner: 'common' }]);
  assert.equal(round(d.total), 477);
});

test('ccCategoryTotals groups + sums (incl negatives)', () => {
  const cats = ccCategoryTotals([
    { amt: 527, category: 'กิน' },
    { amt: 200, category: 'กิน' },
    { amt: 301.67, category: 'ของใช้' },
    { amt: -50, category: 'กิน' },        // cashback nets within category
    { amt: 30, category: '' },             // empty → 'อื่นๆ'
  ]);
  assert.equal(round(cats['กิน']), 677);
  assert.equal(round(cats['ของใช้']), 301.67);
  assert.equal(round(cats['อื่นๆ']), 30);
});

test('CC_CATEGORIES has the defaults incl fallback', () => {
  assert.ok(CC_CATEGORIES.includes('กิน'));
  assert.ok(CC_CATEGORIES.includes('อื่นๆ'));
});

test('parseOCR reads a slip-style block, skips subtotal/total', () => {
  const rows = parseOCR([
    '22/06/26 23/06/26 TOPS-PIN KLAO BANGKOK THA 527.00',
    '27/06/26 28/06/26 OFFICE MATE (THAI) - WEST GATE 301.67',
    'SUBTOTAL FOR 5256 67XX XXXX 5568 1,413.66',
    'ยอดรวมรายการใช้จ่าย / Transaction Amount 1,413.66',
  ].join('\n'));
  assert.equal(rows.length, 2);
  assert.equal(round(rows.reduce((s, r) => s + Number(r.amt), 0)), 828.67);
  assert.equal(rows[0].date, '22/06/26');
  assert.match(rows[0].merchant, /TOPS-PIN KLAO/);
});

test('parseOCR handles "DD MON" dates and strips them from merchant', () => {
  const rows = parseOCR('15 JUN 14 JUN AMZ_SD5! 65.00');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].merchant, 'AMZ_SD5!');
  assert.match(rows[0].date, /15\s?JUN/i);
  assert.equal(Number(rows[0].amt), 65);
});

test('parseOCR flags cashback/refund as negative', () => {
  const rows = parseOCR([
    '25/06/26 CASHBACK เงินคืน 50.00',
    '26/06/26 REFUND OFFICE MATE 30.00',
    '27/06/26 NORMAL SHOP 100.00',
  ].join('\n'));
  assert.equal(Number(rows[0].amt), -50);
  assert.equal(Number(rows[1].amt), -30);
  assert.equal(Number(rows[2].amt), 100);
});

test('parseOCR pairs an amount-only line with the previous description', () => {
  const rows = parseOCR('TOPS-PIN KLAO BANGKOK THA\n527.00');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].merchant, 'TOPS-PIN KLAO BANGKOK THA');
  assert.equal(Number(rows[0].amt), 527);
});

test('merchKey groups by brand, ignoring dates / order-ids / branch', () => {
  assert.equal(merchKey('15 JUN 14 JUN AMZ_SD5!'), 'amz');
  assert.equal(merchKey('AMZ_SD44'), 'amz');
  assert.equal(merchKey('BOOTS_42'), 'boots');
  assert.equal(merchKey('TOPS-PIN KLAO BANGKOK'), 'tops');
  assert.equal(merchKey('618 WATS'), 'wats');
  assert.equal(merchKey(''), '');
});

function round(v) { return Math.round(v * 100) / 100; }
