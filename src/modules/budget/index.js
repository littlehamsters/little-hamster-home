/* Budget module descriptor */
import './budget.js'; // engine (exposes window._bpLoad, _bpRender, …); auto-renders on load

export default {
  id: 'budget',
  name: 'งบประมาณ',
  icon: '💸',
  order: 3,
  storageKeys: ['bp3_months', 'bp3_cfg', 'bp3_theme'],

  // no show() — budget renders itself on engine load and via onRemote

  onRemote() {
    window._bpLoad();
    window._bpRender();
  },

  // home card — latest month: status (คงเหลือ/เกิน) + รายรับ + รายจ่าย
  // (#bp-month label, #bp-status big value, #bp-income, #bp-expense)
  dashboard() {
    try {
      var monthEl = document.getElementById('bp-month');
      var statusEl = document.getElementById('bp-status');
      var incomeEl = document.getElementById('bp-income');
      var expenseEl = document.getElementById('bp-expense');
      if (!statusEl) return;
      var fmt = function (v) {
        return Math.round(v).toLocaleString('th-TH');
      };
      var s =
        typeof window.bpGetHomeSummary === 'function'
          ? window.bpGetHomeSummary()
          : null;
      statusEl.className = 'chip-val big';
      if (s) {
        monthEl.textContent = s.label;
        statusEl.textContent =
          (s.remain >= 0 ? 'เหลือ ' : 'เกิน ') + fmt(Math.abs(s.remain)) + ' ฿';
        statusEl.style.color = s.good ? '#6E9A4C' : '#B85040';
        incomeEl.textContent = fmt(s.income) + ' ฿';
        expenseEl.textContent = fmt(s.expense) + ' ฿';
      } else {
        monthEl.textContent = 'เดือนล่าสุด';
        statusEl.textContent = 'ยังไม่มีข้อมูล';
        statusEl.style.color = '';
        incomeEl.textContent = '-';
        expenseEl.textContent = '-';
      }
    } catch (e) {
      console.error(e);
    }
  },
};
