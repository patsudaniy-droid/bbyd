/* ==========================================================
   Body Scent — script.js (ใช้ร่วมทุกหน้า)
   ตรวจจาก element ที่มีในหน้านั้น แล้วรันเฉพาะฟังก์ชันที่เกี่ยวข้อง
   ========================================================== */

(function () {
  'use strict';

  var ORDERS_KEY = 'bodyScentOrders';
  var MOODS = ['fresh', 'sweet', 'confident', 'romance'];
  var MOOD_LABELS = {
    fresh: 'Fresh',
    sweet: 'Sweet',
    confident: 'Confident',
    romance: 'Romance'
  };

  /* ---------- Helpers ---------- */

  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatPrice(n) {
    return Number(n).toLocaleString('th-TH');
  }

  // เติมค่าลง element ได้ทั้ง input/textarea และ element ทั่วไป
  function setFieldValue(el, value) {
    if (!el) return;
    var tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      el.value = value;
    } else {
      el.textContent = value;
    }
  }

  function getFieldValue(el) {
    if (!el) return '';
    var tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      return el.value.trim();
    }
    return el.textContent.trim();
  }

  function readOrders() {
    try {
      var raw = localStorage.getItem(ORDERS_KEY);
      var data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  /* ==========================================================
     product.html
     ========================================================== */

  function initProductPage(listEl) {
    var filterBar = document.getElementById('filter-bar');
    var products = [];
    var currentMood = 'all';

    function getProductLabel(p) {
      return p.size ? p.name + ' ' + p.size : p.name;
    }

    function buildOrderUrl(p) {
      var params = new URLSearchParams();
      params.set('item', getProductLabel(p));
      params.set('price', p.price);
      return 'order.html?' + params.toString();
    }

    function cardHTML(p) {
      var mood = MOODS.indexOf(p.mood) !== -1 ? p.mood : '';
      var moodLabel = MOOD_LABELS[mood] || p.mood || '';
      var typeLabel = p.type === 'rollon' ? 'โรลออน' : 'สเปรย์';
      var meta = p.size ? typeLabel + ' · ' + p.size : typeLabel;

      return (
        '<article class="product-card" data-mood="' + escapeHTML(p.mood) + '">' +
          '<div class="product-card__image">' +
            '<img src="' + escapeHTML(p.image) + '" alt="' + escapeHTML(p.name) + '" loading="lazy">' +
          '</div>' +
          '<div class="product-card__mood">' +
            '<span class="mood-dot' + (mood ? ' mood-dot--' + mood : '') + '"></span>' +
            escapeHTML(moodLabel) +
          '</div>' +
          '<h3 class="product-card__name">' + escapeHTML(p.name) + '</h3>' +
          '<div class="product-card__meta">' + escapeHTML(meta) + '</div>' +
          '<p class="product-card__desc">' + escapeHTML(p.description) + '</p>' +
          '<div class="product-card__footer">' +
            '<span class="price">' + formatPrice(p.price) + '<small>บาท</small></span>' +
            '<a class="btn btn--gold" href="' + escapeHTML(buildOrderUrl(p)) + '">สั่งซื้อ</a>' +
          '</div>' +
        '</article>'
      );
    }

    function render() {
      var shown = currentMood === 'all'
        ? products
        : products.filter(function (p) { return p.mood === currentMood; });

      if (!shown.length) {
        listEl.innerHTML = '<p class="text-center">ไม่พบสินค้าในหมวดนี้</p>';
        return;
      }
      listEl.innerHTML = shown.map(cardHTML).join('');
    }

    function updateActiveButton() {
      if (!filterBar) return;
      var buttons = filterBar.querySelectorAll('[data-mood]');
      buttons.forEach(function (btn) {
        btn.classList.toggle('is-active', btn.getAttribute('data-mood') === currentMood);
      });
    }

    function setMood(mood) {
      currentMood = (mood === 'all' || MOODS.indexOf(mood) !== -1) ? mood : 'all';
      updateActiveButton();
      render();
    }

    function buildFilterBar() {
      if (!filterBar) return;

      // ถ้าใน HTML ยังไม่มีปุ่ม ให้สร้างให้อัตโนมัติ
      if (!filterBar.querySelector('[data-mood]')) {
        var html = '<button type="button" class="filter__btn" data-mood="all">ทั้งหมด</button>';
        MOODS.forEach(function (m) {
          html += '<button type="button" class="filter__btn" data-mood="' + m + '">' +
                  MOOD_LABELS[m] + '</button>';
        });
        filterBar.innerHTML = html;
      }

      filterBar.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-mood]');
        if (!btn) return;
        setMood(btn.getAttribute('data-mood'));
      });
    }

    buildFilterBar();
    listEl.innerHTML = '<p class="text-center">กำลังโหลดสินค้า...</p>';

    fetch('products.json')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        products = Array.isArray(data) ? data : [];
        var moodParam = new URLSearchParams(window.location.search).get('mood');
        setMood(moodParam ? moodParam.toLowerCase() : 'all');
      })
      .catch(function (err) {
        console.error('โหลด products.json ไม่สำเร็จ:', err);
        listEl.innerHTML =
          '<p class="text-center">ไม่สามารถโหลดข้อมูลสินค้าได้ ' +
          '(หากเปิดไฟล์โดยตรง ให้รันผ่านเว็บเซิร์ฟเวอร์ เช่น Live Server)</p>';
      });
  }

  /* ==========================================================
     order.html
     ========================================================== */

  function initOrderPage(form) {
    var params = new URLSearchParams(window.location.search);
    var itemsEl = document.getElementById('items');
    var totalEl = document.getElementById('total');

    var item = params.get('item') || '';
    var price = params.get('price') || '';

    // เติมทั้งสองช่องเสมอ
    setFieldValue(itemsEl, item);
    setFieldValue(totalEl, price);

    function field(id) {
      return document.getElementById(id) ||
             (form.elements && form.elements[id]) || null;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var payload = {
        customerName: getFieldValue(field('customerName')),
        contact: getFieldValue(field('contact')),
        items: getFieldValue(itemsEl),
        total: getFieldValue(totalEl),
        note: getFieldValue(field('note')),
        timestamp: new Date().toISOString()
      };

      try {
        var orders = readOrders();
        orders.push(payload);
        localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
      } catch (err) {
        console.error('บันทึกคำสั่งซื้อไม่สำเร็จ:', err);
        alert('ไม่สามารถบันทึกคำสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง');
        return;
      }

      window.location.href = 'thankyou.html';
    });
  }

  /* ==========================================================
     admin.html
     ========================================================== */

  function initAdminPage(table) {
    var tbody = table.querySelector('tbody') || table.appendChild(document.createElement('tbody'));
    var colCount = (table.querySelectorAll('thead th').length) || 6;

    var orders = readOrders().slice().sort(function (a, b) {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    if (!orders.length) {
      tbody.innerHTML =
        '<tr><td colspan="' + colCount + '" class="text-center">ยังไม่มีคำสั่งซื้อ</td></tr>';
      return;
    }

    tbody.innerHTML = orders.map(function (o) {
      var d = new Date(o.timestamp);
      var dateText = isNaN(d.getTime()) ? '-' : d.toLocaleString('th-TH');
      var totalNum = Number(o.total);
      var totalText = o.total !== '' && !isNaN(totalNum) ? formatPrice(totalNum) : (o.total || '-');

      return (
        '<tr>' +
          '<td>' + escapeHTML(dateText) + '</td>' +
          '<td>' + escapeHTML(o.customerName || '-') + '</td>' +
          '<td>' + escapeHTML(o.contact || '-') + '</td>' +
          '<td>' + escapeHTML(o.items || '-') + '</td>' +
          '<td>' + escapeHTML(totalText) + '</td>' +
          '<td>' + escapeHTML(o.note || '-') + '</td>' +
        '</tr>'
      );
    }).join('');
  }

  /* ==========================================================
     Boot — ตรวจว่าหน้านี้มี element อะไร แล้วรันฟังก์ชันที่ตรงกัน
     ========================================================== */

  document.addEventListener('DOMContentLoaded', function () {
    var productList = document.getElementById('product-list');
    var orderForm = document.getElementById('orderForm');
    var ordersTable = document.getElementById('ordersTable');

    if (productList) initProductPage(productList);
    if (orderForm) initOrderPage(orderForm);
    if (ordersTable) initAdminPage(ordersTable);
  });
})();
