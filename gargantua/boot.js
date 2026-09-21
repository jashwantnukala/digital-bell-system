/* GARGANTUA boot — tiny, synchronous, runs in <head> before first paint.
   1. Marks the document as "gx" so the glass theme applies (no flash of the old light theme).
   2. Paints the last frame of the previous page as the background, so navigating between
      documents feels like one continuous environment while the renderer starts up.
   3. On a first visit to the home page, hides the hero copy until the intro reveals it.
   If the main bundle never loads, a watchdog restores everything after a few seconds. */
(function () {
  var d = document.documentElement;
  d.classList.add('gx');
  var file = (location.pathname.split('/').pop() || '');
  var home = file === '' || file === 'index.html';
  d.setAttribute('data-gx-page', home ? 'home' : 'inner');
  try {
    var s = JSON.parse(sessionStorage.getItem('gx.state') || 'null');
    if (s && s.v === 1 && s.poster && Date.now() - s.t < 20000) {
      d.style.backgroundImage = 'url("' + s.poster + '")';
      d.classList.add('gx-poster');
    }
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (home && !reduce && !sessionStorage.getItem('gx.introSeen')) d.classList.add('gx-intro');
  } catch (e) { /* storage unavailable: no poster, no intro gate */ }
  setTimeout(function () { d.classList.remove('gx-intro'); }, 9000);
})();
