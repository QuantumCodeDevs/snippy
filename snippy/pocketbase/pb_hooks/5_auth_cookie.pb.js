// Snippy auth cookie for PocketBase.
// The users JWT lives in an HttpOnly cookie instead of the SPA's localStorage,
// so script running on the page (an XSS) can never read or exfiltrate it.

/// <reference path='../pb_data/types.d.ts' />

// Copy the cookie into the Authorization header just before PocketBase's
// loadAuthToken middleware (priority -1020) reads it. An explicit header
// (Admin UI, scripts) always wins. Cross-origin requests never use the cookie.
routerUse(
  new Middleware(
    (e) => {
      const lib = require(`${__hooks}/lib.js`);
      if (!e.request.header.get('Authorization') && lib.isSameOriginRequest(e)) {
        const token = lib.readAuthCookie(e);
        if (token) e.request.header.set('Authorization', token);
      }
      return e.next();
    },
    -1025,
    'snippyAuthCookie'
  )
);

// Every users auth response (password, OAuth2, refresh) sets the cookie and
// sends an empty token in the JSON body, so the SPA only ever sees the record.
onRecordAuthRequest((e) => {
  const lib = require(`${__hooks}/lib.js`);
  // PocketBase checks MFA after this hook, so a cookie set here would skip it.
  if (e.collection.mfa.enabled) {
    throw new BadRequestError('MFA is not supported with cookie sessions');
  }
  lib.setAuthCookie(e, e.token, e.collection.authToken.duration);
  e.token = '';
  e.next();
}, 'users');

// Restore and renew the session on SPA startup. Anonymous visitors get
// `{ record: null }` instead of a 401, and a stale cookie is expired.
routerAdd('POST', '/api/snippy/session', (e) => {
  const lib = require(`${__hooks}/lib.js`);
  e.response.header().set('Cache-Control', 'no-store');
  if (!e.auth || e.auth.collection().name !== 'users') {
    if (lib.readAuthCookie(e)) lib.clearAuthCookie(e);
    return e.json(200, { record: null });
  }
  return $apis.recordAuthResponse(e, e.auth, '', null);
});

// JavaScript cannot delete an HttpOnly cookie, so sign-out goes through here.
routerAdd('POST', '/api/snippy/logout', (e) => {
  const lib = require(`${__hooks}/lib.js`);
  lib.clearAuthCookie(e);
  return e.noContent(204);
});
