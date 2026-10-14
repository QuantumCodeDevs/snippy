// Snippy counters for PocketBase.
// This handles counters for favorites and comments, and comment shape checks.

/// <reference path="../pb_data/types.d.ts" />

// Create a favorite.
onRecordAfterCreateSuccess((e) => {
  const lib = require(`${__hooks}/lib.js`);
  try {
    lib.bumpCount(e.app, 'snippets', e.record.get('snippet'), 'favoriteCount', 1);
  } catch (err) {
    console.log('favoriteCount create', err);
  }
  e.next();
}, 'favorites');

// Delete a favorite.
onRecordAfterDeleteSuccess((e) => {
  const lib = require(`${__hooks}/lib.js`);
  try {
    lib.bumpCount(e.app, 'snippets', e.record.get('snippet'), 'favoriteCount', -1);
  } catch (err) {
    console.log('favoriteCount delete', err);
  }
  e.next();
}, 'favorites');

// Reply parent must belong to the same snippet. Empty comments are rejected.
onRecordCreateRequest((e) => {
  const lib = require(`${__hooks}/lib.js`);
  lib.assertCommentParent(e.app, e.record);
  if (!e.record.getString('content').trim()) {
    throw new BadRequestError('Comment is empty');
  }
  e.next();
}, 'comments');

// Lock a soft-deleted body to empty, and keep replies on the same snippet.
onRecordUpdateRequest((e) => {
  const lib = require(`${__hooks}/lib.js`);
  lib.assertCommentParent(e.app, e.record);
  if (e.record.getBool('isDeleted')) {
    e.record.set('content', '');
  } else if (!e.record.getString('content').trim()) {
    throw new BadRequestError('Comment is empty');
  }
  e.next();
}, 'comments');

// Create a comment.
onRecordAfterCreateSuccess((e) => {
  const lib = require(`${__hooks}/lib.js`);
  try {
    lib.bumpCount(e.app, 'snippets', e.record.get('snippet'), 'commentCount', 1);
  } catch (err) {
    console.log('commentCount create', err);
  }
  e.next();
}, 'comments');

// Delete a comment.
onRecordAfterDeleteSuccess((e) => {
  const lib = require(`${__hooks}/lib.js`);
  try {
    if (!e.record.getBool('isDeleted')) {
      lib.bumpCount(e.app, 'snippets', e.record.get('snippet'), 'commentCount', -1);
    }
  } catch (err) {
    console.log('commentCount delete', err);
  }
  e.next();
}, 'comments');

// Soft-delete decrements; restoring a comment increments again.
onRecordAfterUpdateSuccess((e) => {
  const lib = require(`${__hooks}/lib.js`);
  try {
    const original = e.record.original();
    const was = original ? original.getBool('isDeleted') : false;
    const now = e.record.getBool('isDeleted');
    if (now && !was) {
      lib.bumpCount(e.app, 'snippets', e.record.get('snippet'), 'commentCount', -1);
    } else if (!now && was) {
      lib.bumpCount(e.app, 'snippets', e.record.get('snippet'), 'commentCount', 1);
    }
  } catch (err) {
    console.log('commentCount soft-delete', err);
  }
  e.next();
}, 'comments');
