/// <reference path="../pb_data/types.d.ts" />

// Protects `snippets.snapshot`. PocketBase serves a protected file only to
// requests that pass the collection view rule, so public snippet snapshots stay
// open to everyone while private ones need the owner's file token (`?token=`).
// File tokens last an hour so lazy-loaded list thumbnails keep working; the
// client also refreshes the token when a thumbnail fails to load.
migrate(
  (app) => {
    const snippets = app.findCollectionByNameOrId('snippets');
    const snapshot = snippets.fields.getByName('snapshot');
    if (snapshot) snapshot.protected = true;
    app.save(snippets);

    const users = app.findCollectionByNameOrId('users');
    users.fileToken.duration = 3600;
    app.save(users);
  },
  (app) => {
    const snippets = app.findCollectionByNameOrId('snippets');
    const snapshot = snippets.fields.getByName('snapshot');
    if (snapshot) snapshot.protected = false;
    app.save(snippets);

    const users = app.findCollectionByNameOrId('users');
    users.fileToken.duration = 180;
    app.save(users);
  }
);
