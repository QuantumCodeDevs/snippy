(function () {
  var failed = location.hash.indexOf('oauth2-redirect-failure') !== -1;
  var msg = document.getElementById('msg');
  if (failed) {
    document.title = 'Sign-in failed';
    if (msg) msg.textContent = 'Sign-in did not finish. Close this window and try again.';
  }
  window.close();
  try {
    window.open('', '_self');
  } catch (e) {}
  window.close();
})();
