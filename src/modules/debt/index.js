/* Debt module descriptor */
import './debt.js'; // engine (exposes window._debtLoad, _debtRender, debt* handlers)

export default {
  id: 'debt',
  name: 'จัดการหนี้สิน',
  icon: '💳',
  order: 6,
  storageKeys: ['debt_v1'],

  show() {
    window._debtLoad();
    window._debtRender();
  },

  onRemote() {
    window._debtLoad();
    window._debtRender();
  },

  // home card (#debt-total / #debt-remain / #debt-count)
  dashboard() {
    try {
      var raw = JSON.parse(localStorage.getItem('debt_v1') || 'null');
      var totalEl = document.getElementById('debt-total');
      var remainEl = document.getElementById('debt-remain');
      var countEl = document.getElementById('debt-count');
      if (!totalEl) return;
      if (raw && raw.debts && raw.debts.length) {
        window._debtLoad();
        var total = 0,
          paid = 0;
        raw.debts.forEach(function (d) {
          total += window._dDebtTotal(d);
          paid += window._dDebtPaid(d);
        });
        var remain = Math.max(0, total - paid);
        totalEl.textContent = Math.round(total).toLocaleString('th-TH') + ' ฿';
        remainEl.textContent = Math.round(remain).toLocaleString('th-TH') + ' ฿';
        countEl.textContent = raw.debts.length + ' รายการ';
      } else {
        totalEl.textContent = 'ยังไม่มีข้อมูล';
        remainEl.textContent = '-';
        countEl.textContent = '-';
      }
    } catch (e) {
      console.error(e);
    }
  },
};
