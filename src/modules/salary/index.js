/* Salary & tax module descriptor */
import './salary.js'; // engine — self-contained IIFE, exposes window.stInit / stReloadFromStorage / stGetHomeSummary

const stFmt2 = (v) => Math.round(v).toLocaleString('th-TH');

export default {
  id: 'salary',
  name: 'ภาษีเงินเดือน',
  icon: '📊',
  order: 4,
  storageKeys: ['salaryTaxPlanner_v2'],

  firstShow() {
    window.stInit();
  },
  show() {
    if (typeof window.stReloadFromStorage === 'function')
      window.stReloadFromStorage();
  },
  onRemote() {
    if (typeof window.stReloadFromStorage === 'function')
      window.stReloadFromStorage();
  },

  // home card (#st-home-tax / #st-home-income / #st-home-diff)
  dashboard() {
    try {
      var stSum =
        typeof window.stGetHomeSummary === 'function'
          ? window.stGetHomeSummary()
          : null;
      if (!stSum) {
        // fallback: read localStorage directly
        var stRaw = JSON.parse(
          localStorage.getItem('salaryTaxPlanner_v2') || 'null'
        );
        if (stRaw && stRaw.people && stRaw.people.length) {
          var _TI = 0,
            _TT = 0,
            _TW = 0;
          stRaw.people.forEach(function (p) {
            var inc = p.income || [];
            var income = inc.reduce(function (s, m) {
              return s + (+m.salary || 0) + (+m.ot || 0) + (+m.bonus || 0);
            }, 0);
            var tSSO = inc.reduce(function (s, m) {
              return s + (+m.sso || 0);
            }, 0);
            var pvdC = inc.reduce(function (s, m) {
              return s + ((+m.salary || 0) * (+m.pvdPct || 0)) / 100;
            }, 0);
            var tWHT = inc.reduce(function (s, m) {
              return s + (+m.wht || 0);
            }, 0);
            var exp = Math.min(income * 0.5, 100000);
            var d = p.ded || {},
              g = function (k) {
                return +d[k] || 0;
              };
            var sso = Math.min(tSSO, 9000),
              pvdD = Math.min(pvdC, income * 0.15, 500000);
            var fix =
              60000 +
              (g('dSpouse') > 0 ? 60000 : 0) +
              g('dChild') * 30000 +
              g('dChild2') * 30000 +
              Math.min(g('dParent'), 4) * 30000 +
              Math.min(g('dMaternity'), 60000) +
              sso +
              Math.min(g('dLife') + Math.min(g('dHealth'), 25000), 100000) +
              Math.min(g('dParentHealth'), 15000) +
              Math.min(
                Math.min(g('dRMF'), income * 0.3) +
                  Math.min(g('dPension'), income * 0.15, 200000) +
                  pvdD,
                500000
              ) +
              Math.min(g('dESG'), income * 0.3, 300000) +
              Math.min(g('dHome'), 100000) +
              Math.min(g('dEreceipt'), 50000);
            var base = Math.max(0, income - exp - fix);
            var donate = Math.min(g('dDonate') + g('dDonateEdu') * 2, base * 0.1);
            var net = Math.max(0, income - exp - fix - donate);
            var tax = 0;
            [
              [0, 150000, 0],
              [150000, 300000, 0.05],
              [300000, 500000, 0.1],
              [500000, 750000, 0.15],
              [750000, 1000000, 0.2],
              [1000000, 2000000, 0.25],
              [2000000, 5000000, 0.3],
              [5000000, 1e9, 0.35],
            ].forEach(function (b) {
              if (net > b[0]) tax += (Math.min(net, b[1]) - b[0]) * b[2];
            });
            _TI += income;
            _TT += tax;
            _TW += tWHT;
          });
          stSum = { totIncome: _TI, totTax: _TT, diff: _TW - _TT };
        }
      }
      if (stSum) {
        var diff2 = stSum.diff,
          diffEl = document.getElementById('st-home-diff');
        document.getElementById('st-home-tax').textContent =
          stFmt2(stSum.totTax) + ' ฿';
        document.getElementById('st-home-income').textContent =
          stFmt2(stSum.totIncome) + ' ฿';
        if (diffEl) {
          diffEl.textContent = (diff2 >= 0 ? '+' : '') + stFmt2(diff2) + ' ฿';
          diffEl.className = 'chip-val ' + (diff2 >= 0 ? 'green' : '');
          diffEl.style.color = diff2 >= 0 ? '' : '#B85040';
        }
      } else {
        document.getElementById('st-home-tax').textContent = 'ยังไม่มีข้อมูล';
      }
    } catch (e) {
      console.error(e);
    }
  },
};
