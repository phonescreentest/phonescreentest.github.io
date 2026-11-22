/* Phone Screen Test — header menu (hamburger + Tools dropdown). Runs on every page. */
(function () {
  var menuBtn = document.getElementById('menuBtn');
  var mainNav = document.querySelector('nav.main');
  if (menuBtn && mainNav) {
    menuBtn.addEventListener('click', function () {
      var open = mainNav.classList.toggle('open');
      menuBtn.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mainNav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        mainNav.classList.remove('open');
        menuBtn.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }
  var drop = document.querySelector('.nav-drop');
  if (!drop) return;
  var btn = drop.querySelector('.nav-drop-btn');
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = drop.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.addEventListener('click', function (e) {
    if (!drop.contains(e.target)) {
      drop.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
})();
