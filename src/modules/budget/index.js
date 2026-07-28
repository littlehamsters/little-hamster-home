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

  // home card (#bp-month / #bp-status / #bp-count)
  dashboard() {
    try {
      var bp = JSON.parse(localStorage.getItem('bp3_months') || 'null');
      var d = new Date();
      var mkey =
        d.getFullYear() + '-' + String(d.getMonth()).padStart(2, '0');
      var mnames = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
      ];
      document.getElementById('bp-month').textContent =
        mnames[d.getMonth()] + ' ' + (d.getFullYear() + 543);
      if (bp && bp[mkey]) {
        var mon = bp[mkey];
        var nExp = 0;
        try {
          ['p1', 'p2'].forEach(function (p) {
            if (mon.expenses && mon.expenses[p]) {
              nExp += Object.keys(mon.expenses[p].fixed || {}).length;
              nExp += (mon.expenses[p].extras || []).length;
            }
          });
        } catch (ex) {}
        document.getElementById('bp-status').textContent = 'มีข้อมูลแล้ว ✓';
        document.getElementById('bp-status').className = 'chip-val green';
        document.getElementById('bp-count').textContent = nExp + ' รายการ';
      } else {
        document.getElementById('bp-status').textContent = 'ยังไม่มีข้อมูล';
        document.getElementById('bp-count').textContent = '-';
      }
    } catch (e) {
      console.error(e);
    }
  },
};
