// Snippy snippets for PocketBase.
// This handles collections.

/// <reference path="../pb_data/types.d.ts" />

// Generate a unique short ID for a snippet.
onRecordCreateRequest((e) => {
  const lib = require(`${__hooks}/lib.js`);
  if (!e.record.getString('shortId')) {
    e.record.set('shortId', lib.uniqueShortId(e.app, 'snippets'));
  }
  e.next();
}, 'snippets');

// Generate a unique short ID for a collection.
onRecordCreateRequest((e) => {
  const lib = require(`${__hooks}/lib.js`);
  if (!e.record.getString('shortId')) {
    e.record.set('shortId', lib.uniqueShortId(e.app, 'collections'));
  }
  e.next();
}, 'collections');

// Mark every fork when the source pen is deleted.
// Collect ids before e.next(): PocketBase clears parentSnippet inside the
// delete transaction, before a success hook would run.
onRecordDelete((e) => {
  const batch = 200;
  let offset = 0;
  const childIds = [];
  try {
    for (;;) {
      const children = e.app.findRecordsByFilter(
        'snippets',
        'parentSnippet = {:id}',
        'id',
        batch,
        offset,
        { id: e.record.id }
      );
      if (!children || !children.length) break;
      for (const child of children) childIds.push(child.id);
      offset += children.length;
      if (children.length < batch) break;
    }
  } catch (err) {
    console.log('parentDeleted lookup failed', err);
  }

  e.next();

  for (const id of childIds) {
    try {
      const child = e.app.findRecordById('snippets', id);
      if (!child.getBool('parentDeleted')) {
        child.set('parentDeleted', true);
        e.app.save(child);
      }
    } catch (err) {
      console.log('parentDeleted update failed', err);
    }
  }
}, 'snippets');
