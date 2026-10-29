/// <reference path="../pb_data/types.d.ts" />

// Auth tokens last 2 days instead of PocketBase's 7-day default, which limits
// how long a stolen token works. The frontend renews the token through
// authRefresh while the user is active (AuthStoreService.refreshSession).
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    users.authToken.duration = 172800;
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    users.authToken.duration = 604800;
    app.save(users);
  }
);
