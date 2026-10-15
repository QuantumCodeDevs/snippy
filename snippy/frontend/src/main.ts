import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

declare global {
  interface Window {
    __snippyOauthPopup?: boolean;
  }
}

function isOauthPopup() {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const hash = location.hash || '';
  return path === '/_' || hash.includes('oauth2-redirect');
}

function closeOauthPopup() {
  const failed = (location.hash || '').includes('oauth2-redirect-failure');
  window.__snippyOauthPopup = true;
  document.documentElement.setAttribute('data-oauth-popup', '');
  document.title = failed ? 'Sign-in failed' : 'Signed in';
  const msg = document.getElementById('oauth-popup-msg');
  if (msg && failed) {
    msg.textContent = 'Sign-in did not finish. Close this window and try again.';
  }
  window.close();
  try {
    window.open('', '_self');
  } catch {
    // Firefox can reject the reopen after the GitHub redirect.
  }
  window.close();
}

if (window.__snippyOauthPopup || isOauthPopup()) {
  closeOauthPopup();
} else {
  bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
}
