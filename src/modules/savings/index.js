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

  // home card (#sv-total / #sv-funds / #sv-last)
  dashboard() {
    try {
      var sv = JSON.parse(localStorage.getItem('savings_jars_v1') || 'null');
      if (sv && sv.funds && sv.funds.length) {
        var act = sv.funds.filter(function (f) {
          return !f.closed;
        });
        var tot = act.reduce(function (s, f) {
          return (
            s +
            (f.tx || []).reduce(function (a, t) {
              return a + (t.type === 'in' ? t.amt : -t.amt);
            }, 0)
          );
        }, 0);
        var ts = [];
        sv.funds.forEach(function (f) {
          (f.tx || []).forEach(function (t) {
            ts.push(t.ts || 0);
          });
        });
        var ld = ts.length
          ? new Date(Math.max.apply(null, ts)).toLocaleDateString('th-TH', {
              day: 'numeric',
              month: 'short',
            })
          : '-';
        document.getElementById('sv-total').textContent =
          Math.round(tot).toLocaleString('th-TH') + ' ฿';
        document.getElementById('sv-funds').textContent = act.length + ' กอง';
        document.getElementById('sv-last').textContent = ld;
      } else {
        document.getElementById('sv-total').textContent = 'ยังไม่มีข้อมูล';
      }
    } catch (e) {
      console.error(e);
    }
  },
};
