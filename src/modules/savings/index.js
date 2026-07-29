/* Savings module descriptor */
import './savings.js'; // engine (exposes window._svLoad, _svRender, …)

const afterResize = () =>
  setTimeout(() => window.dispatchEvent(new Event('resize')), 80);

export default {
  id: 'savings',
  name: 'กองออม',
  icon: '🌸',
  order: 2,
  storageKeys: ['savings_jars_v1'],

  show() {
    window._svLoad();
    window._svRender();
    afterResize();
  },

  onRemote() {
    window._svLoad();
    window._svRender();
  },

  // home card (#sv-total / #sv-funds / #sv-pct = progress toward goals)
  dashboard() {
    try {
      var sv = JSON.parse(localStorage.getItem('savings_jars_v1') || 'null');
      var bal = function (f) {
        return (f.tx || []).reduce(function (a, t) {
          return a + (t.type === 'in' ? t.amt : -t.amt);
        }, 0);
      };
      if (sv && sv.funds && sv.funds.length) {
        var act = sv.funds.filter(function (f) {
          return !f.closed;
        });
        var tot = act.reduce(function (s, f) {
          return s + bal(f);
        }, 0);
        // overall progress: saved / goal across funds that have a goal (capped per fund)
        var withGoal = act.filter(function (f) {
          return (+f.goal || 0) > 0;
        });
        var totalGoal = withGoal.reduce(function (s, f) {
          return s + (+f.goal || 0);
        }, 0);
        var progress = withGoal.reduce(function (s, f) {
          return s + Math.min(Math.max(bal(f), 0), +f.goal || 0);
        }, 0);
        document.getElementById('sv-total').textContent =
          Math.round(tot).toLocaleString('th-TH') + ' ฿';
        document.getElementById('sv-funds').textContent = act.length + ' กอง';
        document.getElementById('sv-pct').textContent = totalGoal > 0
          ? Math.round((progress / totalGoal) * 100) + '%'
          : 'ยังไม่ตั้งเป้า';
      } else {
        document.getElementById('sv-total').textContent = 'ยังไม่มีข้อมูล';
        document.getElementById('sv-funds').textContent = '-';
        document.getElementById('sv-pct').textContent = '-';
      }
    } catch (e) {
      console.error(e);
    }
  },
};
