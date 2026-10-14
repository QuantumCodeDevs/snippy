/// <reference path="../pb_data/types.d.ts" />

// Existing installs ran 1740000000 before autodate fields were added.
// PocketBase 0.23+ only auto-inserts `id` on custom collections.
migrate((app) => {
  const names = [
    'snippets',
    'snippet_files',
    'comments',
    'favorites',
    'follows',
    'collections',
    'collection_snippets',
    'snippet_views',
    'assets',
  ];
  for (const name of names) {
    const col = app.findCollectionByNameOrId(name);
    if (!col.fields.getByName('created')) {
      col.fields.add(
        new AutodateField({
          name: 'created',
          onCreate: true,
          onUpdate: false,
        })
      );
    }
    if (!col.fields.getByName('updated')) {
      col.fields.add(
        new AutodateField({
          name: 'updated',
          onCreate: true,
          onUpdate: true,
        })
      );
    }
    app.save(col);
  }
});
