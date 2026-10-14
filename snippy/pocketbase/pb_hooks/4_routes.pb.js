// Snippy API routes for PocketBase.
// This handles routes that the pocketbase API is not able to handle.

/// <reference path="../pb_data/types.d.ts" />

// Get Snippy meta data.
routerAdd('GET', '/api/snippy/meta', (e) => {
  const settings = e.app.settings();
  const users = e.app.findCollectionByNameOrId('users');
  const oauth = (users.oauth2.enabled ? users.oauth2.providers || [] : [])
    .filter((p) => p && p.name)
    .map((p) => ({
      name: p.name,
      displayName: p.displayName || p.name,
    }));
  return e.json(200, {
    smtpEnabled: !!settings.smtp.enabled,
    oauth,
  });
});

// Get a shared snippet by token.
routerAdd('GET', '/api/snippy/shared/{token}', (e) => {
  const token = e.request.pathValue('token');
  if (!token) throw new BadRequestError('Missing token');
  const lib = require(`${__hooks}/lib.js`);
  const snippet = e.app.findFirstRecordByFilter('snippets', 'shareToken = {:token}', { token });
  const files = e.app.findRecordsByFilter(
    'snippet_files',
    'snippet = {:id}',
    'fileType',
    10,
    0,
    { id: snippet.id }
  );
  e.app.expandRecord(snippet, ['user'], null);
  return e.json(200, { snippet: lib.publicSnippet(snippet), files: lib.publicFiles(files) });
});

// Create a share link for a snippet.
routerAdd(
  'POST',
  '/api/snippy/snippets/{id}/share',
  (e) => {
    const lib = require(`${__hooks}/lib.js`);
    const auth = lib.requireAuth(e);
    const snippet = e.app.findRecordById('snippets', e.request.pathValue('id'));
    if (snippet.get('user') !== auth.id) throw new ForbiddenError();
    const token = $security.randomString(21);
    snippet.set('shareToken', token);
    e.app.save(snippet);
    return e.json(200, { shareToken: token });
  },
  $apis.requireAuth()
);

// Delete a share link for a snippet.
routerAdd(
  'DELETE',
  '/api/snippy/snippets/{id}/share',
  (e) => {
    const lib = require(`${__hooks}/lib.js`);
    const auth = lib.requireAuth(e);
    const snippet = e.app.findRecordById('snippets', e.request.pathValue('id'));
    if (snippet.get('user') !== auth.id) throw new ForbiddenError();
    snippet.set('shareToken', '');
    e.app.save(snippet);
    return e.json(200, { shareToken: null });
  },
  $apis.requireAuth()
);

// Record a view for a snippet.
routerAdd(
  'POST',
  '/api/snippy/snippets/{id}/view',
  (e) => {
    const lib = require(`${__hooks}/lib.js`);
    const VIEW_COOLDOWN_MS = 24 * 60 * 60 * 1000;
    const auth = lib.requireAuth(e);
    const snippet = e.app.findRecordById('snippets', e.request.pathValue('id'));
    if (snippet.getBool('isPrivate') && snippet.get('user') !== auth.id) {
      throw new ForbiddenError();
    }
    const result = { counted: false, viewCount: snippet.getInt('viewCount') };
    e.app.runInTransaction((txApp) => {
      const current = txApp.findRecordById('snippets', snippet.id);
      const now = Date.now();
      let existing = null;
      try {
        existing = txApp.findFirstRecordByFilter(
          'snippet_views',
          'snippet = {:sid} && user = {:uid}',
          { sid: snippet.id, uid: auth.id }
        );
      } catch (err) {
        existing = null;
      }
      if (existing) {
        const last = existing.getInt('lastViewedAt') || 0;
        if (now - last < VIEW_COOLDOWN_MS) {
          result.viewCount = current.getInt('viewCount');
          return;
        }
        existing.set('lastViewedAt', now);
        txApp.save(existing);
      } else {
        try {
          const col = txApp.findCollectionByNameOrId('snippet_views');
          const rec = new Record(col);
          rec.set('snippet', snippet.id);
          rec.set('user', auth.id);
          rec.set('lastViewedAt', now);
          txApp.save(rec);
        } catch (err) {
          result.viewCount = current.getInt('viewCount');
          return;
        }
      }
      result.counted = true;
      result.viewCount = lib.bumpCount(txApp, 'snippets', snippet.id, 'viewCount', 1);
    });
    return e.json(200, result);
  },
  $apis.requireAuth()
);

// Fork a snippet.
routerAdd(
  'POST',
  '/api/snippy/snippets/{id}/fork',
  (e) => {
    const lib = require(`${__hooks}/lib.js`);
    const auth = lib.requireAuth(e);
    const source = e.app.findRecordById('snippets', e.request.pathValue('id'));
    if (source.getBool('isPrivate') && source.get('user') !== auth.id) {
      throw new ForbiddenError();
    }
    e.app.expandRecord(source, ['user'], null);
    const owner = source.expandedOne('user');

    const files = e.app.findRecordsByFilter(
      'snippet_files',
      'snippet = {:id}',
      'fileType',
      10,
      0,
      { id: source.id }
    );
    let copyId = '';
    e.app.runInTransaction((txApp) => {
      const col = txApp.findCollectionByNameOrId('snippets');
      const copy = new Record(col);
      copy.set('user', auth.id);
      copy.set('shortId', lib.uniqueShortId(txApp, 'snippets'));
      copy.set('name', source.getString('name'));
      copy.set('description', source.getString('description'));
      copy.set('isPrivate', false);
      copy.set('tags', source.get('tags'));
      copy.set('cdnResources', source.get('cdnResources'));
      copy.set('viewCount', 0);
      copy.set('forkCount', 0);
      copy.set('favoriteCount', 0);
      copy.set('commentCount', 0);
      copy.set('embedCount', 0);
      copy.set('parentSnippet', source.id);
      copy.set('parentShortId', source.getString('shortId'));
      copy.set('parentName', source.getString('name'));
      copy.set('parentUserName', owner ? owner.getString('username') : '');
      copy.set('parentDeleted', false);
      txApp.save(copy);
      copyId = copy.id;

      const fileCol = txApp.findCollectionByNameOrId('snippet_files');
      for (const file of files) {
        const f = new Record(fileCol);
        f.set('snippet', copy.id);
        f.set('fileType', file.getString('fileType'));
        f.set('content', file.getString('content'));
        txApp.save(f);
      }

      lib.bumpCount(txApp, 'snippets', source.id, 'forkCount', 1);
    });

    const copy = e.app.findRecordById('snippets', copyId);
    e.app.expandRecord(copy, ['user'], null);
    const copyFiles = e.app.findRecordsByFilter(
      'snippet_files',
      'snippet = {:id}',
      'fileType',
      10,
      0,
      { id: copy.id }
    );
    return e.json(200, { snippet: lib.publicSnippet(copy), files: lib.publicFiles(copyFiles) });
  },
  $apis.requireAuth()
);
