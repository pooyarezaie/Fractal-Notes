/* Keyboard access for navigation, figure enlargement and overflowing content.
   Rebind safely to the DOM produced by the Playwright prerender step. */
(function () {
  'use strict';
  var toggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('side-nav');
  var close = document.getElementById('side-nav-close');
  var overlay = document.getElementById('side-nav-overlay');
  var main = document.querySelector('main');
  var mobile = window.matchMedia('(max-width: 900px)');
  var background = document.querySelectorAll('.skip-link, .site-header, main, .site-footer');
  var opened = false;

  function syncNav(restoreFocus) {
    var modal = mobile.matches && opened;
    nav.classList.toggle('side-nav-open', modal);
    nav.inert = mobile.matches && !opened;
    toggle.setAttribute('aria-expanded', String(modal));
    toggle.setAttribute('aria-label', modal ? 'بستن فهرست مطالب' : 'باز کردن فهرست مطالب');
    overlay.setAttribute('aria-hidden', 'true'); // decorative backdrop only
    document.body.classList.toggle('side-nav-active', modal);
    background.forEach(function (el) { el.inert = modal; });
    if (modal) {
      nav.setAttribute('role', 'dialog');
      nav.setAttribute('aria-modal', 'true');
      close.focus();
    } else {
      nav.removeAttribute('role');
      nav.removeAttribute('aria-modal');
      if (restoreFocus && mobile.matches) toggle.focus();
    }
  }
  function closeNav() { opened = false; syncNav(true); }
  toggle.addEventListener('click', function () { opened = !opened; syncNav(true); });
  close.addEventListener('click', closeNav);
  overlay.addEventListener('click', closeNav);
  mobile.addEventListener('change', function () {
    var focused = nav.contains(document.activeElement);
    opened = false;
    syncNav(focused);
    if (!mobile.matches && document.activeElement === close) nav.querySelector('a').focus();
  });
  document.addEventListener('keydown', function (event) {
    if (!opened || !mobile.matches) return;
    if (event.key === 'Escape') { event.preventDefault(); closeNav(); }
    if (event.key !== 'Tab') return;
    var stops = nav.querySelectorAll('button, a[href]');
    var first = stops[0], last = stops[stops.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });
  syncNav(false);

  document.querySelector('.skip-link').addEventListener('click', function () { main.focus(); });

  function openImage(button, image) {
    var dialog = document.createElement('dialog');
    dialog.className = 'image-lightbox';
    dialog.setAttribute('aria-label', 'نمای بزرگ تصویر');
    var dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'image-lightbox-close';
    dismiss.textContent = '×';
    dismiss.setAttribute('aria-label', 'بستن تصویر');
    var large = document.createElement('img');
    large.className = 'image-lightbox-img';
    large.src = image.currentSrc || image.src;
    large.alt = image.alt;
    dialog.append(dismiss, large);
    document.body.appendChild(dialog);
    dialog.addEventListener('close', function () {
      document.body.classList.remove('image-lightbox-active');
      dialog.remove();
      button.focus();
    }, { once: true });
    dismiss.addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (event) {
      var r = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right ||
          event.clientY < r.top || event.clientY > r.bottom)) dialog.close();
    });
    document.body.classList.add('image-lightbox-active');
    dialog.showModal();
    dismiss.focus();
  }
  main.querySelectorAll('img').forEach(function (image) {
    if (!image.alt || image.closest('a')) return;
    var button = image.closest('button.image-zoom');
    if (!button) {
      if (image.closest('button')) return;
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'image-zoom';
      button.setAttribute('aria-label', 'بزرگ‌نمایی تصویر: ' + image.alt);
      button.setAttribute('aria-haspopup', 'dialog');
      image.before(button);
      button.appendChild(image);
    }
    button.addEventListener('click', function () { openImage(button, image); });
  });

  main.querySelectorAll('table').forEach(function (table) {
    if (table.closest('.scroll-wrapper')) return;
    var wrapper = document.createElement('div');
    wrapper.className = 'scroll-wrapper scroll-table';
    table.before(wrapper);
    wrapper.appendChild(table);
  });
  function updateScrollRegions() {
    main.querySelectorAll('.scroll-wrapper, .katex-display, pre').forEach(function (el) {
      // A hidden disclosure can have zero geometry; update again when opened.
      var overflowing = el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1;
      if (overflowing) {
        el.tabIndex = 0;
        el.setAttribute('role', 'region');
        el.setAttribute('aria-label', el.matches('.katex-display') ? 'فرمول؛ پیمایش افقی با کلیدهای جهت‌نما' :
          el.matches('pre') ? 'کد؛ پیمایش افقی با کلیدهای جهت‌نما' : 'جدول؛ پیمایش افقی با کلیدهای جهت‌نما');
        el.setAttribute('data-scroll-region', 'true');
      } else if (el.hasAttribute('data-scroll-region')) {
        el.removeAttribute('tabindex');
        el.removeAttribute('role');
        el.removeAttribute('aria-label');
        el.removeAttribute('data-scroll-region');
      }
    });
  }
  window.initScrollAndWrap = updateScrollRegions;
  window.addEventListener('resize', updateScrollRegions);
  main.addEventListener('toggle', updateScrollRegions, true);
  if (document.fonts) document.fonts.ready.then(updateScrollRegions);
  updateScrollRegions();
})();
