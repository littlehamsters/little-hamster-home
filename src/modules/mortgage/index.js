/* Mortgage module descriptor */
import './mortgage.js'; // engine (exposes window._moLoad, recalc, … + inline handlers)

const afterResize = () =>
  setTimeout(() => window.dispatchEvent(new Event('resize')), 80);

export default {
  id: 'mortgage',
  name: 'ผ่อนบ้าน',
  icon: '🏠',
  order: 1,
  storageKeys: ['mortgage_real_v5'],

  show() {
    window._moLoad();
    afterResize();
  },

  // home card (#mo-ring / #mo-pct / #mo-rem / #mo-paid)
  dashboard() {
    var C = 314.159;
    try {
      var mo = JSON.parse(localStorage.getItem('mortgage_real_v5') || 'null');
      if (mo && mo.data && mo.data.length) {
        var loan = mo.loanAmt || 7590000,
          last = mo.data[mo.data.length - 1];
        var rem = last.balance || 0,
          paid = loan - rem,
          pct = (paid / loan) * 100;
        var fb = function (v) {
          return Math.round(v).toLocaleString('th-TH');
        };
        document.getElementById('mo-pct').textContent = pct.toFixed(1) + '%';
        var rf = document.getElementById('mo-ring');
        rf.style.strokeDasharray = C.toFixed(2);
        rf.style.strokeDashoffset = (C * (1 - pct / 100)).toFixed(2);
        document.getElementById('mo-rem').textContent = fb(rem) + ' ฿';
        document.getElementById('mo-paid').textContent = fb(paid) + ' ฿';
      } else {
        document.getElementById('mo-pct').textContent = 'ยังไม่มีข้อมูล';
      }
    } catch (e) {
      console.error(e);
    }
  },
};
