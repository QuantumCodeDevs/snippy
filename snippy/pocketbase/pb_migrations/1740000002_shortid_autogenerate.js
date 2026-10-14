/// <reference path="../pb_data/types.d.ts" />

// shortId is required and locked off the client body (@request.body.shortId:isset = false).
// PocketBase validates required fields before onRecordCreateRequest, so the hook never
// gets a chance to fill it. Autogenerate runs first and unblocks create.
migrate((app) => {
  for (const name of ['snippets', 'collections']) {
    const col = app.findCollectionByNameOrId(name);
    const field = col.fields.getByName('shortId');
    field.autogeneratePattern = '[A-Za-z0-9]{7}';
    app.save(col);
  }
});
