// Barra in basso (solo telefono): sezioni come in un'app vera. Su schermo grande il CSS la nasconde.
(function () {
  var nav = document.getElementById('bottomNav');
  if (!nav) return;
  var items = Array.prototype.slice.call(nav.querySelectorAll('[data-go]'));
  var names = items.map(function (b) { return b.getAttribute('data-go'); });
  var mq = window.matchMedia('(max-width: ' + (nav.getAttribute('data-max') || '1099') + 'px)');
  function go(name, opts) {
    if (names.indexOf(name) < 0) name = names[0];
    document.body.setAttribute('data-tab', name);
    items.forEach(function (b) {
      if (b.getAttribute('data-go') === name) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    try { history.replaceState(null, '', name === names[0] ? location.pathname + location.search : '#' + name); } catch (e) {}
    if (mq.matches && !(opts && opts.keepScroll)) window.scrollTo(0, 0);
    if (opts && opts.focus) {
      var el = document.getElementById(opts.focus);
      if (el) setTimeout(function () { el.focus(); }, 60);
    }
  }
  items.forEach(function (b) {
    b.addEventListener('click', function () { go(b.getAttribute('data-go')); });
  });
  window.addEventListener('hashchange', function () { go(location.hash.slice(1), { keepScroll: true }); });
  window.goTab = function (name, opts) { if (mq.matches) go(name, opts); };
  window.navBadge = function (id, n) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = n > 99 ? '99+' : String(n);
    el.hidden = !n;
  };
  go(location.hash.slice(1) || names[0], { keepScroll: true });
})();
