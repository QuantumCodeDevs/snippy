/// <reference path="../pb_data/types.d.ts" />

const COUNTER_LOCK =
  '@request.body.viewCount:isset = false && @request.body.forkCount:isset = false && @request.body.favoriteCount:isset = false && @request.body.commentCount:isset = false && @request.body.embedCount:isset = false && @request.body.shortId:isset = false && @request.body.shareToken:isset = false && @request.body.parentSnippet:isset = false && @request.body.parentShortId:isset = false && @request.body.parentName:isset = false && @request.body.parentUserName:isset = false && @request.body.parentDeleted:isset = false';

// PocketBase 0.23+ only auto-inserts `id`. created/updated are optional autodate fields.
const AUTODATE = [
  { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
  { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
];

migrate((app) => {
  const users = app.findCollectionByNameOrId('users');

  users.listRule = 'id = @request.auth.id || isPrivate = false';
  users.viewRule = 'id = @request.auth.id || isPrivate = false';
  users.createRule = '';
  users.updateRule = 'id = @request.auth.id && @request.body.isAdmin:isset = false';
  users.deleteRule = 'id = @request.auth.id';

  const avatar = users.fields.getByName('avatar');
  if (avatar) {
    avatar.maxSize = 5 * 1024 * 1024;
    avatar.maxSelect = 1;
    avatar.mimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  }

  if (!users.fields.getByName('username')) {
    users.fields.add(
      new TextField({
        name: 'username',
        min: 2,
        max: 32,
        pattern: '^[a-zA-Z0-9_][a-zA-Z0-9_-]{1,31}$',
        autogeneratePattern: '[a-z]{5}[0-9]{4}',
      })
    );
  } else {
    const username = users.fields.getByName('username');
    username.pattern = '^[a-zA-Z0-9_][a-zA-Z0-9_-]{1,31}$';
    username.min = 2;
    username.max = 32;
    username.autogeneratePattern = '[a-z]{5}[0-9]{4}';
  }

  if (!users.fields.getByName('bio')) {
    users.fields.add(
      new TextField({
        name: 'bio',
        max: 500,
      })
    );
  }
  if (!users.fields.getByName('isPrivate')) {
    users.fields.add(
      new BoolField({
        name: 'isPrivate',
      })
    );
  }
  if (!users.fields.getByName('editorPreferences')) {
    users.fields.add(
      new JSONField({
        name: 'editorPreferences',
      })
    );
  }
  if (!users.fields.getByName('isAdmin')) {
    users.fields.add(
      new BoolField({
        name: 'isAdmin',
        hidden: true,
      })
    );
  }

  users.indexes.push('CREATE UNIQUE INDEX idx_users_username ON users (username)');

  // Username must exist on the collection before it can be an identity field.
  app.save(users);
  users.passwordAuth.identityFields = ['email', 'username'];
  app.save(users);

  const snippets = new Collection({
    type: 'base',
    name: 'snippets',
    listRule: 'isPrivate = false || user = @request.auth.id',
    viewRule: 'isPrivate = false || user = @request.auth.id',
    createRule: `@request.auth.id != "" && user = @request.auth.id && ${COUNTER_LOCK}`,
    updateRule: `user = @request.auth.id && ${COUNTER_LOCK}`,
    deleteRule: 'user = @request.auth.id',
    indexes: [
      'CREATE UNIQUE INDEX idx_snippets_short_id ON snippets (shortId)',
      'CREATE INDEX idx_snippets_user ON snippets (user)',
    ],
    fields: [
      {
        name: 'user',
        type: 'relation',
        required: true,
        maxSelect: 1,
        collectionId: users.id,
        cascadeDelete: true,
      },
      {
        name: 'shortId',
        type: 'text',
        required: true,
        min: 7,
        max: 16,
        pattern: '^[A-Za-z0-9]+$',
        autogeneratePattern: '[A-Za-z0-9]{7}',
      },
      { name: 'name', type: 'text', required: true, min: 1, max: 120 },
      { name: 'description', type: 'text', max: 2000 },
      { name: 'isPrivate', type: 'bool' },
      { name: 'tags', type: 'json' },
      { name: 'cdnResources', type: 'json' },
      { name: 'viewCount', type: 'number', min: 0, onlyInt: true },
      { name: 'forkCount', type: 'number', min: 0, onlyInt: true },
      { name: 'favoriteCount', type: 'number', min: 0, onlyInt: true },
      { name: 'commentCount', type: 'number', min: 0, onlyInt: true },
      { name: 'embedCount', type: 'number', min: 0, onlyInt: true },
      { name: 'shareToken', type: 'text', hidden: true, max: 64 },
      { name: 'parentShortId', type: 'text', max: 16 },
      { name: 'parentName', type: 'text', max: 120 },
      { name: 'parentUserName', type: 'text', max: 32 },
      { name: 'parentDeleted', type: 'bool' },
      {
        name: 'snapshot',
        type: 'file',
        maxSelect: 1,
        maxSize: 2 * 1024 * 1024,
        mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
        thumbs: ['320x180'],
      },
      ...AUTODATE,
    ],
  });

  app.save(snippets);

  snippets.fields.add(
    new RelationField({
      name: 'parentSnippet',
      maxSelect: 1,
      collectionId: snippets.id,
      cascadeDelete: false,
    })
  );
  app.save(snippets);

  const snippetFiles = new Collection({
    type: 'base',
    name: 'snippet_files',
    listRule: 'snippet.isPrivate = false || snippet.user = @request.auth.id',
    viewRule: 'snippet.isPrivate = false || snippet.user = @request.auth.id',
    createRule: '@request.auth.id != "" && snippet.user = @request.auth.id',
    updateRule: 'snippet.user = @request.auth.id',
    deleteRule: 'snippet.user = @request.auth.id',
    indexes: [
      'CREATE UNIQUE INDEX idx_snippet_files_type ON snippet_files (snippet, fileType)',
    ],
    fields: [
      {
        name: 'snippet',
        type: 'relation',
        required: true,
        maxSelect: 1,
        collectionId: snippets.id,
        cascadeDelete: true,
      },
      {
        name: 'fileType',
        type: 'select',
        required: true,
        maxSelect: 1,
        values: ['html', 'css', 'js'],
      },
      { name: 'content', type: 'text', max: 500000 },
      ...AUTODATE,
    ],
  });
  app.save(snippetFiles);

  const comments = new Collection({
    type: 'base',
    name: 'comments',
    listRule: 'snippet.isPrivate = false || snippet.user = @request.auth.id',
    viewRule: 'snippet.isPrivate = false || snippet.user = @request.auth.id',
    createRule:
      '@request.auth.id != "" && user = @request.auth.id && @request.body.isDeleted:isset = false',
    updateRule: 'user = @request.auth.id || snippet.user = @request.auth.id',
    deleteRule: 'user = @request.auth.id || snippet.user = @request.auth.id',
    indexes: ['CREATE INDEX idx_comments_snippet ON comments (snippet)'],
    fields: [
      {
        name: 'snippet',
        type: 'relation',
        required: true,
        maxSelect: 1,
        collectionId: snippets.id,
        cascadeDelete: true,
      },
      {
        name: 'user',
        type: 'relation',
        required: true,
        maxSelect: 1,
        collectionId: users.id,
        cascadeDelete: true,
      },
      { name: 'content', type: 'text', required: true, min: 1, max: 2000 },
      { name: 'isDeleted', type: 'bool' },
      ...AUTODATE,
    ],
  });
  app.save(comments);
  comments.fields.add(
    new RelationField({
      name: 'parentComment',
      maxSelect: 1,
      collectionId: comments.id,
      cascadeDelete: true,
    })
  );
  app.save(comments);

  const favorites = new Collection({
    type: 'base',
    name: 'favorites',
    listRule: 'user = @request.auth.id',
    viewRule: 'user = @request.auth.id',
    createRule: '@request.auth.id != "" && user = @request.auth.id',
    updateRule: null,
    deleteRule: 'user = @request.auth.id',
    indexes: ['CREATE UNIQUE INDEX idx_favorites_pair ON favorites (snippet, user)'],
    fields: [
      {
        name: 'snippet',
        type: 'relation',
        required: true,
        maxSelect: 1,
        collectionId: snippets.id,
        cascadeDelete: true,
      },
      {
        name: 'user',
        type: 'relation',
        required: true,
        maxSelect: 1,
        collectionId: users.id,
        cascadeDelete: true,
      },
      ...AUTODATE,
    ],
  });
  app.save(favorites);

  const follows = new Collection({
    type: 'base',
    name: 'follows',
    listRule:
      'follower = @request.auth.id || following = @request.auth.id || (follower.isPrivate = false && following.isPrivate = false)',
    viewRule:
      'follower = @request.auth.id || following = @request.auth.id || (follower.isPrivate = false && following.isPrivate = false)',
    createRule: '@request.auth.id != "" && follower = @request.auth.id',
    updateRule: null,
    deleteRule: 'follower = @request.auth.id',
    indexes: ['CREATE UNIQUE INDEX idx_follows_pair ON follows (follower, following)'],
    fields: [
      {
        name: 'follower',
        type: 'relation',
        required: true,
        maxSelect: 1,
        collectionId: users.id,
        cascadeDelete: true,
      },
      {
        name: 'following',
        type: 'relation',
        required: true,
        maxSelect: 1,
        collectionId: users.id,
        cascadeDelete: true,
      },
      ...AUTODATE,
    ],
  });
  app.save(follows);

  const collections = new Collection({
    type: 'base',
    name: 'collections',
    listRule: 'isPrivate = false || user = @request.auth.id',
    viewRule: 'isPrivate = false || user = @request.auth.id',
    createRule:
      '@request.auth.id != "" && user = @request.auth.id && @request.body.shortId:isset = false',
    updateRule: 'user = @request.auth.id && @request.body.shortId:isset = false',
    deleteRule: 'user = @request.auth.id',
    indexes: [
      'CREATE UNIQUE INDEX idx_collections_short_id ON collections (shortId)',
      'CREATE INDEX idx_collections_user ON collections (user)',
    ],
    fields: [
      {
        name: 'user',
        type: 'relation',
        required: true,
        maxSelect: 1,
        collectionId: users.id,
        cascadeDelete: true,
      },
      {
        name: 'shortId',
        type: 'text',
        required: true,
        min: 7,
        max: 16,
        autogeneratePattern: '[A-Za-z0-9]{7}',
      },
      { name: 'name', type: 'text', required: true, min: 1, max: 120 },
      { name: 'description', type: 'text', max: 2000 },
      { name: 'isPrivate', type: 'bool' },
      ...AUTODATE,
    ],
  });
  app.save(collections);

  const collectionSnippets = new Collection({
    type: 'base',
    name: 'collection_snippets',
    listRule: 'collection.isPrivate = false || collection.user = @request.auth.id',
    viewRule: 'collection.isPrivate = false || collection.user = @request.auth.id',
    createRule: '@request.auth.id != "" && collection.user = @request.auth.id',
    updateRule: null,
    deleteRule: 'collection.user = @request.auth.id',
    indexes: [
      'CREATE UNIQUE INDEX idx_collection_snippets_pair ON collection_snippets (collection, snippet)',
    ],
    fields: [
      {
        name: 'collection',
        type: 'relation',
        required: true,
        maxSelect: 1,
        collectionId: collections.id,
        cascadeDelete: true,
      },
      {
        name: 'snippet',
        type: 'relation',
        required: true,
        maxSelect: 1,
        collectionId: snippets.id,
        cascadeDelete: true,
      },
      ...AUTODATE,
    ],
  });
  app.save(collectionSnippets);

  const snippetViews = new Collection({
    type: 'base',
    name: 'snippet_views',
    listRule: 'user = @request.auth.id',
    viewRule: 'user = @request.auth.id',
    createRule: '@request.auth.id != "" && user = @request.auth.id',
    updateRule: 'user = @request.auth.id',
    deleteRule: 'user = @request.auth.id',
    indexes: ['CREATE UNIQUE INDEX idx_snippet_views_pair ON snippet_views (snippet, user)'],
    fields: [
      {
        name: 'snippet',
        type: 'relation',
        required: true,
        maxSelect: 1,
        collectionId: snippets.id,
        cascadeDelete: true,
      },
      {
        name: 'user',
        type: 'relation',
        required: true,
        maxSelect: 1,
        collectionId: users.id,
        cascadeDelete: true,
      },
      { name: 'lastViewedAt', type: 'number', required: true, onlyInt: true },
      ...AUTODATE,
    ],
  });
  app.save(snippetViews);

  const assets = new Collection({
    type: 'base',
    name: 'assets',
    listRule: 'user = @request.auth.id',
    viewRule: 'user = @request.auth.id',
    createRule: '@request.auth.id != "" && user = @request.auth.id',
    updateRule: 'user = @request.auth.id',
    deleteRule: 'user = @request.auth.id',
    indexes: ['CREATE INDEX idx_assets_user ON assets (user)'],
    fields: [
      {
        name: 'user',
        type: 'relation',
        required: true,
        maxSelect: 1,
        collectionId: users.id,
        cascadeDelete: true,
      },
      {
        name: 'file',
        type: 'file',
        required: true,
        maxSelect: 1,
        maxSize: 5 * 1024 * 1024,
        mimeTypes: [
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
        ],
      },
      { name: 'originalName', type: 'text', max: 255 },
      { name: 'mimeType', type: 'text', max: 120 },
      { name: 'size', type: 'number', min: 0, onlyInt: true },
      ...AUTODATE,
    ],
  });
  app.save(assets);
}, (app) => {
  const names = [
    'assets',
    'snippet_views',
    'collection_snippets',
    'collections',
    'follows',
    'favorites',
    'comments',
    'snippet_files',
    'snippets',
  ];
  for (const name of names) {
    try {
      app.delete(app.findCollectionByNameOrId(name));
    } catch (err) {
      console.log('rollback skip', name, err);
    }
  }
});
