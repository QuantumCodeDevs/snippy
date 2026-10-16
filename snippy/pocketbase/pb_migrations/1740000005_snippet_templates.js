/// <reference path="../pb_data/types.d.ts" />

// Lets owners mark a snippet as a reusable template. The new-snippet picker
// lists the signed-in user's templates next to the built-in starters.
// Plain owner-writable bool: the existing snippets update rule already limits
// writes to the owner. Forks never copy it (the fork route sets fields explicitly).
migrate(
  (app) => {
    const snippets = app.findCollectionByNameOrId('snippets');
    if (!snippets.fields.getByName('isTemplate')) {
      snippets.fields.add(new BoolField({ name: 'isTemplate' }));
    }
    snippets.addIndex('idx_snippets_user_template', false, 'user, isTemplate', '');
    app.save(snippets);
  },
  (app) => {
    const snippets = app.findCollectionByNameOrId('snippets');
    snippets.removeIndex('idx_snippets_user_template');
    snippets.fields.removeByName('isTemplate');
    app.save(snippets);
  }
);
