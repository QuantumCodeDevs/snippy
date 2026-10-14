/// <reference path="../pb_data/types.d.ts" />

// Tightens rules from 1740000000 for databases that already applied it.
// Fresh installs run that migration first, then this one.

const VISIBLE_SNIPPET = 'snippet.isPrivate = false || snippet.user = @request.auth.id';

const COMMENT_CREATE =
  '@request.auth.id != "" && user = @request.auth.id && @request.body.isDeleted:isset = false && (' +
  VISIBLE_SNIPPET +
  ')';

const COMMENT_UPDATE =
  '(' +
  'user = @request.auth.id && @request.body.user:isset = false && @request.body.snippet:isset = false && @request.body.parentComment:isset = false' +
  ') || (' +
  'snippet.user = @request.auth.id && @request.body.user:isset = false && @request.body.snippet:isset = false && @request.body.parentComment:isset = false && @request.body.content:isset = false' +
  ')';

const ASSET_MIME = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'font/woff',
  'font/woff2',
  'application/font-woff',
  'text/plain',
  'text/css',
  'application/javascript',
  'audio/mpeg',
  'audio/ogg',
  'video/mp4',
];

const PREVIOUS_ASSET_MIME = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'font/woff',
  'font/woff2',
  'application/font-woff',
  'application/octet-stream',
  'text/plain',
  'text/css',
  'application/javascript',
  'audio/mpeg',
  'audio/ogg',
  'video/mp4',
];

migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  users.createRule = '@request.body.isAdmin:isset = false || @request.body.isAdmin = false';
  app.save(users);

  const comments = app.findCollectionByNameOrId('comments');
  comments.createRule = COMMENT_CREATE;
  comments.updateRule = COMMENT_UPDATE;
  const content = comments.fields.getByName('content');
  if (content) {
    content.required = false;
    content.min = 0;
  }
  app.save(comments);

  const favorites = app.findCollectionByNameOrId('favorites');
  favorites.createRule =
    '@request.auth.id != "" && user = @request.auth.id && (' + VISIBLE_SNIPPET + ')';
  app.save(favorites);

  const follows = app.findCollectionByNameOrId('follows');
  follows.createRule =
    '@request.auth.id != "" && follower = @request.auth.id && follower != following';
  app.save(follows);

  const collectionSnippets = app.findCollectionByNameOrId('collection_snippets');
  collectionSnippets.createRule =
    '@request.auth.id != "" && collection.user = @request.auth.id && (' + VISIBLE_SNIPPET + ')';
  app.save(collectionSnippets);

  const snippetViews = app.findCollectionByNameOrId('snippet_views');
  snippetViews.listRule = null;
  snippetViews.viewRule = null;
  snippetViews.createRule = null;
  snippetViews.updateRule = null;
  snippetViews.deleteRule = null;
  app.save(snippetViews);

  const assets = app.findCollectionByNameOrId('assets');
  const file = assets.fields.getByName('file');
  if (file) file.mimeTypes = ASSET_MIME;
  app.save(assets);
}, (app) => {
  const users = app.findCollectionByNameOrId('users');
  users.createRule = '';
  app.save(users);

  const comments = app.findCollectionByNameOrId('comments');
  comments.createRule =
    '@request.auth.id != "" && user = @request.auth.id && @request.body.isDeleted:isset = false';
  comments.updateRule = 'user = @request.auth.id || snippet.user = @request.auth.id';
  const content = comments.fields.getByName('content');
  if (content) {
    content.required = true;
    content.min = 1;
  }
  app.save(comments);

  const favorites = app.findCollectionByNameOrId('favorites');
  favorites.createRule = '@request.auth.id != "" && user = @request.auth.id';
  app.save(favorites);

  const follows = app.findCollectionByNameOrId('follows');
  follows.createRule = '@request.auth.id != "" && follower = @request.auth.id';
  app.save(follows);

  const collectionSnippets = app.findCollectionByNameOrId('collection_snippets');
  collectionSnippets.createRule = '@request.auth.id != "" && collection.user = @request.auth.id';
  app.save(collectionSnippets);

  const snippetViews = app.findCollectionByNameOrId('snippet_views');
  snippetViews.listRule = 'user = @request.auth.id';
  snippetViews.viewRule = 'user = @request.auth.id';
  snippetViews.createRule = '@request.auth.id != "" && user = @request.auth.id';
  snippetViews.updateRule = 'user = @request.auth.id';
  snippetViews.deleteRule = 'user = @request.auth.id';
  app.save(snippetViews);

  const assets = app.findCollectionByNameOrId('assets');
  const file = assets.fields.getByName('file');
  if (file) file.mimeTypes = PREVIOUS_ASSET_MIME;
  app.save(assets);
});
