/* Future expenses module descriptor */
import './future.js';

export default {
  id: 'future',
  name: 'ค่าใช้จ่ายในอนาคต',
  icon: '📋',
  order: 6,
  storageKeys: ['future_expenses_v1'],

  show() {
    window._feLoad();
    window._feRender();
  },

  onRemote() {
    window._feLoad();
    window._feRender();
  },

  // home card (#fe-dash-total / #fe-dash-next / #fe-dash-next-amt)
  dashboard() {
    try {
      var raw = JSON.parse(localStorage.getItem('future_expenses_v1') || 'null');
      var totalEl   = document.getElementById('fe-dash-total');
      var nextEl    = document.getElementById('fe-dash-next');
      var nextAmtEl = document.getElementById('fe-dash-next-amt');
      if (!totalEl) return;

      function reset() {
        totalEl.textContent = 'ยังไม่มีข้อมูล';
        if (nextEl)    { nextEl.textContent = '—'; nextEl.className = 'chip-val yellow'; nextEl.style.color = ''; }
        if (nextAmtEl) { nextAmtEl.textContent = '—'; }
      }

      if (!raw || !raw.items || !raw.items.length) { reset(); return; }

      var now = new Date();
      var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      var upcoming = raw.items.filter(function(i) { return i.status === 'upcoming'; });
      var total = upcoming.reduce(function(s, i) { return s + (i.amt || 0); }, 0);
      totalEl.textContent = Math.round(total).toLocaleString('th-TH') + ' ฿';

      // nearest item = smallest positive daysUntil; fallback to most-recently-overdue
      var withDate = upcoming.filter(function(i) { return i.dueDate; });
      withDate.sort(function(a, b) {
        var da = Math.round((new Date(a.dueDate + 'T00:00:00') - today) / 86400000);
        var db = Math.round((new Date(b.dueDate + 'T00:00:00') - today) / 86400000);
        if (da >= 0 && db < 0) return -1;
        if (da < 0 && db >= 0) return 1;
        return Math.abs(da) - Math.abs(db);
      });

      var nearest = withDate[0];
      if (nearest && nextEl) {
        var days = Math.round((new Date(nearest.dueDate + 'T00:00:00') - today) / 86400000);
        var dateTxt = new Date(nearest.dueDate + 'T00:00:00')
          .toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
        var countdown = days < 0 ? 'เลย ' + Math.abs(days) + ' วัน'
                      : days === 0 ? 'วันนี้'
                      : 'อีก ' + days + ' วัน';
        nextEl.textContent = dateTxt + ' · ' + countdown;
        nextEl.className   = 'chip-val yellow';
        nextEl.style.color = days < 0 ? '#B85040' : days <= 7 ? '' : '';
        if (nextAmtEl) {
          var sameDay = withDate.filter(function(i) { return i.dueDate === nearest.dueDate; });
          var dayTotal = sameDay.reduce(function(s, i) { return s + (i.amt || 0); }, 0);
          nextAmtEl.textContent = Math.round(dayTotal).toLocaleString('th-TH') + ' ฿';
        }
      } else {
        if (nextEl)    { nextEl.textContent = '—'; nextEl.className = 'chip-val yellow'; nextEl.style.color = ''; }
        if (nextAmtEl) nextAmtEl.textContent = '—';
      }
    } catch(e) {}
  },
};
