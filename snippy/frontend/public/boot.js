// Runs before first paint, loaded from index.html. Kept out of index.html so the
// app CSP can stay `script-src 'self'` with no inline scripts.
(function () {
  // OAuth popup: close before the app module loads (main.ts repeats this).
  var path = location.pathname.replace(/\/+$/, '') || '/';
  var hash = location.hash || '';
  if (path === '/_' || hash.indexOf('oauth2-redirect') !== -1) {
    window.__snippyOauthPopup = true;
    document.documentElement.setAttribute('data-oauth-popup', '');
    var failed = hash.indexOf('oauth2-redirect-failure') !== -1;
    document.title = failed ? 'Sign-in failed' : 'Signed in';
    document.addEventListener('DOMContentLoaded', function () {
      var msg = document.getElementById('oauth-popup-msg');
      if (msg && failed) {
        msg.textContent = 'Sign-in did not finish. Close this window and try again.';
      }
    });
    window.close();
    try {
      window.open('', '_self');
    } catch (e) {}
    window.close();
  }

  // Theme: set before paint so the page does not flash the wrong theme.
  try {
    var theme = localStorage.getItem('snippy-theme');
    if (theme !== 'light' && theme !== 'dark') {
      theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  } catch (e) {}
})();
