# PocketBase collections, rules, and hooks

Schema lives in git as JS migrations. Do not treat the Admin UI as the source of truth — prototype there if useful, then export into [`snippy/pocketbase/pb_migrations`](../snippy/pocketbase/pb_migrations).

Hooks: [`snippy/pocketbase/pb_hooks`](../snippy/pocketbase/pb_hooks) (`*.pb.js` — PocketBase ignores plain `.js` hook files).

SQLite WAL is the database. It lives in the `pb_data` volume on the PocketBase container, next to uploaded files. One PocketBase process is the writer. A second process must not open that file. Scale by giving that container more CPU, RAM, and disk. The frontend container does not use the volume, so it can be replicated. Moving the PocketBase container and `pb_data` to another host later does not change the SPA: the browser only calls same-origin `/api/`.

Search uses collection `~` filters on name, description, and tags. Counter fields are updated with a single `UPDATE ... SET field = MAX(0, field + delta)` so concurrent requests do not lose increments. That is enough at this size. A networked database would mean leaving PocketBase.

## Collections

| Collection | Kind | Purpose |
|---|---|---|
| `users` | auth | Email/password + optional OAuth. Extra fields: `username`, `bio`, `isPrivate`, `editorPreferences`. Built-in `name`, `avatar`. `isAdmin` is hidden. |
| `snippets` | base | Owner relation, `shortId`, privacy, `isTemplate`, tags/cdn JSON, counters, hidden `shareToken`, parent denorm, `snapshot` file |
| `snippet_files` | base | `html` / `css` / `js` + text content |
| `comments` | base | Threaded via `parentComment` |
| `favorites` | base | Unique `(snippet, user)` |
| `follows` | base | Unique `(follower, following)` |
| `collections` | base | Owner playlists with `shortId` |
| `collection_snippets` | base | Unique `(collection, snippet)` |
| `snippet_views` | base | 24h unique view ledger |
| `assets` | base | Per-user file library |

Custom collections include autodate `created` / `updated`. PocketBase 0.23+ only auto-inserts `id`.

## API rules (not client-trusted)

Pattern:

- **List/view snippets:** `isPrivate = false || user = @request.auth.id`
- **Create/update/delete:** authenticated owner (`user = @request.auth.id`). Update rules check the stored record, so owners also need `@request.body.user:isset = false` to stop them handing a snippet or collection to another user.
- Nested `snippet_files` follow parent visibility (`snippet.isPrivate = false || snippet.user = @request.auth.id`). An update cannot change `snippet` or `fileType`, so a row cannot be moved onto another user's snippet.
- **Comments, favorites, collection membership:** create only when the snippet is public or owned by the caller. A comment author can edit their own text and soft-delete it, but cannot undo a soft-delete. They cannot change `user`, `snippet`, or `parentComment`. The snippet owner can soft-delete a comment and cannot rewrite it or reassign it. A reply's parent must be a comment on the same snippet (hook).
- **Follows:** `follower = @request.auth.id` and `follower != following`
- **`snippet_views`:** API rules are null (superuser / hooks only). The view route writes the 24h ledger. Clients cannot delete a row to count again.
- Counter, `shortId`, `shareToken`, and parent fields, plus owner relations (`user` on snippets and collections, `snippet`/`fileType` on snippet_files): `@request.body.<field>:isset = false`
- `isAdmin` cannot be set on create or update. `editorPreferences` is stripped from other users' API responses.
- Share tokens are **hidden**. List rules never use `shareToken != ""`. Fetch is `GET /api/snippy/shared/{token}` only. That route returns a field list (no email, no `shareToken`). Fork does the same.
- Asset MIME types do not include SVG or `application/octet-stream`.

Clients must not write `viewCount`, `forkCount`, `favoriteCount`, `commentCount`, `embedCount`.

Bool filters: `isPrivate = false` does **not** match NULL. Set `isPrivate` explicitly on create.

## Adding a collection or field

1. Add a **new** timestamped file under `snippy/pocketbase/pb_migrations` (do not rewrite a migration that already ran).
2. For a new collection, include autodate fields:

```js
{ type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
{ type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
```

3. If a required public id is generated server-side and locked with `@request.body.<field>:isset = false`, set `autogeneratePattern` on the text field so validation succeeds before hooks (see `shortId`).
4. Set list/view/create/update/delete rules and unique indexes.
5. Restart PocketBase: `docker compose restart pocketbase`. Bind-mounts pick up new migrations and hooks.
6. Optional: add a hook in `pb_hooks` as `*.pb.js`. Shared helpers live in `lib.js` and must be `require()`d **inside** the hook callback (executor VMs do not see other files' top-level bindings).

### Wiring the field in the frontend

Full path (domain type, mapper, JWT vs API rules, no `*Response` envelopes): [frontend.md — Extending](frontend.md#extending).

1. Type in [`snippy/frontend/src/app/models/`](../snippy/frontend/src/app/models/)
2. Map PocketBase records in [`pb-mappers.ts`](../snippy/frontend/src/app/services/data/pb-mappers.ts)
3. CRUD / filters in [`SnippyApi`](../snippy/frontend/src/app/services/data/snippy-api.service.ts) using `this.pb.filter('field = {:id}', { id })`
4. Store + page or dialog as needed

## Hooks and custom routes

- Favorite create/delete → `favoriteCount` (own snippets allowed)
- Comment create/delete/soft-delete → `commentCount`
- Fork `POST /api/snippy/snippets/{id}/fork` → copy files, bump source `forkCount` (never copies `isTemplate`)
- Snippet delete (`onRecordDelete`) → collect fork ids where `parentSnippet` matches **before** `e.next()`. PocketBase clears that relation inside the delete transaction, so an after-delete query would miss them. After the delete succeeds, set `parentDeleted` on those forks. Fork files are not removed.
- `GET /api/snippy/embed/{shortId}` → snippet and files only when `isPrivate` is false. Missing and private are both 404, including for the owner. `Cache-Control: no-store`
- `GET /api/snippy/sitemap.xml` → public snippets whose owner profile is public, plus those profiles and static pages. Absolute URLs from `PB_APP_URL`
- View `POST /api/snippy/snippets/{id}/view` → 24h unique in `snippet_views` (collection locked to hooks), bump `viewCount` inside one transaction
- Share create/revoke custom routes generate or clear `shareToken`
- User create (`onRecordCreate`) → unique `username`, default `name`, `isPrivate = false`
- Before snippet/collection create → unique `shortId` (plus `autogeneratePattern`)
- `GET /api/snippy/meta` → `{ smtpEnabled, oauth: [{ name, displayName }] }` (no secrets)
- Bootstrap: SMTP, GitHub/Google OAuth, reset-email `actionUrl` from env
- Account delete cascades via PocketBase relations + file fields

## Files

Avatars (`users.avatar`), snippet snapshots (`snippets.snapshot`), and the asset library (`assets.file`) are PocketBase file fields. Avatars and assets are public by URL. `snippets.snapshot` is protected, so PocketBase checks the snippets view rule on each download: public snapshots stay open to everyone, and private ones need the owner's file token (`?token=`, valid for an hour). The frontend adds it through `FileTokenService`. nginx proxies `/api/files/` as part of `/api/` and sets `X-Content-Type-Options: nosniff`. Avatars are jpeg, png, gif, or webp. The asset library adds fonts, text, CSS, JavaScript, audio, and mp4. SVG is rejected so a file opened on the site origin cannot run script.

## Tests

`snippy/pocketbase/tests/rules.test.mjs` asserts private-list rules, counter locks, owner-field locks, the 2-day auth token, hidden share tokens, owner-scoped favorites, autodate/`shortId` autogenerate, meta route, the public-only embed route, the fork `parentDeleted` hook, and OAuth env keys.
