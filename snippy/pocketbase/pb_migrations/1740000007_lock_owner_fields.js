/// <reference path="../pb_data/types.d.ts" />

// Update rules run against the stored record, so `user = @request.auth.id` only
// proves the caller owns it now. Without a body guard the owner could PATCH the
// relation to someone else: hand a snippet or collection to another user, or
// move a snippet_files row onto another user's snippet. Comment authors may
// soft-delete their comment but not undo a soft-delete.

const COUNTER_LOCK =
  '@request.body.viewCount:isset = false && @request.body.forkCount:isset = false && @request.body.favoriteCount:isset = false && @request.body.commentCount:isset = false && @request.body.embedCount:isset = false && @request.body.shortId:isset = false && @request.body.shareToken:isset = false && @request.body.parentSnippet:isset = false && @request.body.parentShortId:isset = false && @request.body.parentName:isset = false && @request.body.parentUserName:isset = false && @request.body.parentDeleted:isset = false';

const RELATION_LOCK =
  '@request.body.user:isset = false && @request.body.snippet:isset = false && @request.body.parentComment:isset = false';

const COMMENT_UPDATE =
  '(' +
  'user = @request.auth.id && ' +
  RELATION_LOCK +
  ' && (@request.body.isDeleted:isset = false || @request.body.isDeleted = true)' +
  ') || (' +
  'snippet.user = @request.auth.id && ' +
  RELATION_LOCK +
  ' && @request.body.content:isset = false' +
  ')';

const PREVIOUS_COMMENT_UPDATE =
  '(' +
  'user = @request.auth.id && ' +
  RELATION_LOCK +
  ') || (' +
  'snippet.user = @request.auth.id && ' +
  RELATION_LOCK +
  ' && @request.body.content:isset = false' +
  ')';

migrate(
  (app) => {
    const snippets = app.findCollectionByNameOrId('snippets');
    snippets.updateRule = `user = @request.auth.id && @request.body.user:isset = false && ${COUNTER_LOCK}`;
    app.save(snippets);

    const collections = app.findCollectionByNameOrId('collections');
    collections.updateRule =
      'user = @request.auth.id && @request.body.user:isset = false && @request.body.shortId:isset = false';
    app.save(collections);

    const snippetFiles = app.findCollectionByNameOrId('snippet_files');
    snippetFiles.updateRule =
      'snippet.user = @request.auth.id && @request.body.snippet:isset = false && @request.body.fileType:isset = false';
    app.save(snippetFiles);

    const comments = app.findCollectionByNameOrId('comments');
    comments.updateRule = COMMENT_UPDATE;
    app.save(comments);
  },
  (app) => {
    const snippets = app.findCollectionByNameOrId('snippets');
    snippets.updateRule = `user = @request.auth.id && ${COUNTER_LOCK}`;
    app.save(snippets);

    const collections = app.findCollectionByNameOrId('collections');
    collections.updateRule = 'user = @request.auth.id && @request.body.shortId:isset = false';
    app.save(collections);

    const snippetFiles = app.findCollectionByNameOrId('snippet_files');
    snippetFiles.updateRule = 'snippet.user = @request.auth.id';
    app.save(snippetFiles);

    const comments = app.findCollectionByNameOrId('comments');
    comments.updateRule = PREVIOUS_COMMENT_UPDATE;
    app.save(comments);
  }
);
