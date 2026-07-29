/* Car module descriptor */
import './car.js'; // engine (exposes window._carLoad, _carRender, car* handlers)

export default {
  id: 'car',
  name: 'บันทึกรถ',
  icon: '🚗',
  order: 5,
  storageKeys: ['car_v1'],

  show() {
    window._carLoad();
    window._carRender();
  },

  onRemote() {
    window._carLoad();
    window._carRender();
  },

  // home card (#car-total / #car-count / #car-next)
  dashboard() {
    try {
      var raw = JSON.parse(localStorage.getItem('car_v1') || 'null');
      var totalEl = document.getElementById('car-total');
      var countEl = document.getElementById('car-count');
      var nextEl = document.getElementById('car-next');
      if (!totalEl) return;
      if (raw && raw.cars && raw.cars.length) {
        window._carLoad(); // normalise into state for the helpers below
        var grand = raw.cars.reduce(function (s, c) {
          return s + window._carTotal(c);
        }, 0);
        totalEl.textContent = Math.round(grand).toLocaleString('th-TH') + ' ฿';
        countEl.textContent = raw.cars.length + ' คัน';
        var nx = window._carNextRenew();
        if (nx) {
          var mo =
            typeof window._cMonths === 'function'
              ? window._cMonths(nx.days)
              : Math.round(Math.abs(nx.days) / 30.44) + ' เดือน';
          var when = (nx.days < 0 ? 'เลย ' : 'อีก ') + mo;
          nextEl.textContent = nx.label + ' · ' + when;
          nextEl.className =
            'chip-val ' + (nx.days < 0 ? '' : nx.days <= 30 ? 'yellow' : 'green');
          nextEl.style.color = nx.days < 0 ? '#B85040' : '';
        } else {
          nextEl.textContent = '—';
        }
      } else {
        totalEl.textContent = 'ยังไม่มีข้อมูล';
        countEl.textContent = '-';
        nextEl.textContent = '-';
      }
    } catch (e) {
      console.error(e);
    }
  },
};
