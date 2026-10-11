// "Metti in home" — pulsante discreto + guida breve per iPhone (Pi.Gi)
(function () {
  var APP = (document.querySelector('meta[name="application-name"]') || {}).content || document.title;
  var btns = Array.prototype.slice.call(document.querySelectorAll('#installBtn, [data-install]'));
  var sheet = document.getElementById('installSheet');
  if (!btns.length || !sheet) return;
  // un solo oggetto che mostra/nasconde tutti i pulsanti "Metti in home"
  var btn = {
    set hidden(v) { btns.forEach(function (b) { b.hidden = v; }); },
    addEventListener: function (t, f) { btns.forEach(function (b) { b.addEventListener(t, f); }); }
  };
  var deferred = null;
  var ua = navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function standalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  }
  function show(el, on) { el.hidden = !on; }
  if (standalone()) { show(btn, false); return; }
  // Su iPhone e su Android il pulsante c'è sempre (discreto); altrove solo se il browser lo permette
  var isAndroid = /Android/i.test(ua);
  show(btn, isIOS || isAndroid);
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e; show(btn, true);
  });
  window.addEventListener('appinstalled', function () {
    deferred = null; show(btn, false); show(sheet, false);
  });
  function openSheet() {
    var ios = sheet.querySelector('[data-ios]'), other = sheet.querySelector('[data-other]');
    show(ios, isIOS); show(other, !isIOS);
    show(sheet, true);
    var c = sheet.querySelector('[data-close]'); if (c) c.focus();
  }
  btn.addEventListener('click', function () {
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.finally(function () { deferred = null; });
      return;
    }
    openSheet();
  });
  sheet.addEventListener('click', function (e) {
    if (e.target === sheet || e.target.hasAttribute('data-close')) show(sheet, false);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') show(sheet, false); });
  var names = sheet.querySelectorAll('[data-appname]');
  for (var i = 0; i < names.length; i++) names[i].textContent = APP;
})();
