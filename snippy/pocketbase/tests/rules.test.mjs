import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const repoRoot = path.resolve(root, '../..');
const migration = fs.readFileSync(
  path.join(root, 'pb_migrations/1740000000_snippy_schema.js'),
  'utf8'
);
const tighten = fs.readFileSync(
  path.join(root, 'pb_migrations/1740000004_tighten_access.js'),
  'utf8'
);
const templates = fs.readFileSync(
  path.join(root, 'pb_migrations/1740000005_snippet_templates.js'),
  'utf8'
);
const routes = fs.readFileSync(path.join(root, 'pb_hooks/4_routes.pb.js'), 'utf8');
const snippetsHook = fs.readFileSync(path.join(root, 'pb_hooks/2_snippets.pb.js'), 'utf8');
const settings = fs.readFileSync(path.join(root, 'pb_hooks/0_settings.pb.js'), 'utf8');
const usersHook = fs.readFileSync(path.join(root, 'pb_hooks/1_users.pb.js'), 'utf8');
const util = fs.readFileSync(path.join(root, 'pb_hooks/lib.js'), 'utf8');
const counters = fs.readFileSync(path.join(root, 'pb_hooks/3_counters.pb.js'), 'utf8');
const entrypoint = fs.readFileSync(path.join(root, 'entrypoint.sh'), 'utf8');
const envExample = fs.readFileSync(path.join(repoRoot, '.env.example'), 'utf8');
const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
const frontendDoc = fs.readFileSync(path.join(repoRoot, 'documentation/frontend.md'), 'utf8');
const dbDoc = fs.readFileSync(path.join(repoRoot, 'documentation/db.md'), 'utf8');
const authStore = fs.readFileSync(
  path.join(repoRoot, 'snippy/frontend/src/app/services/stores/auth.store.service.ts'),
  'utf8'
);
const initialsSrc = fs.readFileSync(
  path.join(repoRoot, 'snippy/frontend/src/app/utils/user-initials.ts'),
  'utf8'
);

describe('PocketBase API rules', () => {
  it('hides private snippets from public list/view', () => {
    assert.match(migration, /listRule: 'isPrivate = false \|\| user = @request\.auth\.id'/);
    assert.match(migration, /viewRule: 'isPrivate = false \|\| user = @request\.auth\.id'/);
  });

  it('locks counter and identity fields on snippet writes', () => {
    assert.match(migration, /@request\.body\.viewCount:isset = false/);
    assert.match(migration, /@request\.body\.forkCount:isset = false/);
    assert.match(migration, /@request\.body\.favoriteCount:isset = false/);
    assert.match(migration, /@request\.body\.shareToken:isset = false/);
    assert.match(migration, /@request\.body\.shortId:isset = false/);
  });

  it('keeps share tokens hidden and only fetchable via custom route', () => {
    assert.match(migration, /name: 'shareToken'[\s\S]*hidden: true/);
    assert.match(routes, /\/api\/snippy\/shared\/\{token\}/);
    assert.doesNotMatch(migration, /shareToken != ""/);
  });

  it('scopes favorites, assets, and views to the authenticated owner', () => {
    assert.match(migration, /name: 'favorites'[\s\S]*listRule: 'user = @request\.auth\.id'/);
    assert.match(migration, /name: 'assets'[\s\S]*listRule: 'user = @request\.auth\.id'/);
    assert.match(migration, /name: 'snippet_views'[\s\S]*listRule: 'user = @request\.auth\.id'/);
  });

  it('protects snippet snapshots so private ones follow the snippet view rule', () => {
    const protect = fs.readFileSync(
      path.join(root, 'pb_migrations/1740000006_protect_snapshots.js'),
      'utf8'
    );
    assert.match(protect, /getByName\('snapshot'\)[\s\S]*snapshot\.protected = true/);
    assert.match(protect, /fileToken\.duration = 3600/);
  });

  it('stops owners from reassigning records to other users', () => {
    const lock = fs.readFileSync(
      path.join(root, 'pb_migrations/1740000007_lock_owner_fields.js'),
      'utf8'
    );
    const up = lock.slice(lock.indexOf('migrate('), lock.indexOf('(app) => {', lock.indexOf('migrate(') + 20));
    assert.match(
      up,
      /snippets\.updateRule = `user = @request\.auth\.id && @request\.body\.user:isset = false && \$\{COUNTER_LOCK\}`/
    );
    assert.match(
      up,
      /collections\.updateRule =\s*'user = @request\.auth\.id && @request\.body\.user:isset = false && @request\.body\.shortId:isset = false'/
    );
    assert.match(
      up,
      /snippetFiles\.updateRule =\s*'snippet\.user = @request\.auth\.id && @request\.body\.snippet:isset = false && @request\.body\.fileType:isset = false'/
    );
    assert.match(up, /comments\.updateRule = COMMENT_UPDATE/);
    const commentRule = lock.slice(
      lock.indexOf('const COMMENT_UPDATE'),
      lock.indexOf('const PREVIOUS_COMMENT_UPDATE')
    );
    assert.match(
      commentRule,
      /@request\.body\.isDeleted:isset = false \|\| @request\.body\.isDeleted = true/
    );
  });

  it('limits auth tokens to 2 days', () => {
    const tokens = fs.readFileSync(
      path.join(root, 'pb_migrations/1740000008_auth_token_duration.js'),
      'utf8'
    );
    assert.match(tokens, /authToken\.duration = 172800/);
    assert.match(authStore, /refreshSession/);
  });

  it('hides isAdmin from clients', () => {
    assert.match(migration, /name: 'isAdmin'[\s\S]*hidden: true/);
    assert.match(migration, /@request\.body\.isAdmin:isset = false/);
  });

  it('defines autodate created/updated on custom collections', () => {
    assert.match(migration, /type: 'autodate', name: 'created'/);
    assert.match(migration, /type: 'autodate', name: 'updated'/);
  });

  it('autogenerates shortId so clients are not required to send it', () => {
    assert.match(migration, /autogeneratePattern: '\[A-Za-z0-9\]\{7\}'/);
  });

  it('registers GitHub and Google OAuth from env', () => {
    assert.match(settings, /PB_GITHUB_CLIENT_ID/);
    assert.match(settings, /PB_GOOGLE_CLIENT_ID/);
    assert.match(settings, /onBootstrap/);
  });

  it('exposes public auth meta without secrets', () => {
    assert.match(routes, /\/api\/snippy\/meta/);
    assert.match(routes, /smtpEnabled/);
  });

  it('assigns username on record create, not only on the HTTP request hook', () => {
    assert.match(usersHook, /onRecordCreate\(/);
    assert.match(usersHook, /uniqueUsername/);
    assert.match(migration, /autogeneratePattern: '\[a-z\]\{5\}\[0-9\]\{4\}'/);
  });

  it('resolves relation ids before bumping favorite counters', () => {
    assert.match(util, /function relationId/);
  });

  it('does not default CORS to star', () => {
    assert.doesNotMatch(envExample, /PB_ALLOWED_ORIGINS=\*/);
    assert.match(entrypoint, /http:\/\/localhost:4200/);
    assert.match(entrypoint, /PB_APP_URL/);
    assert.match(readme, /Allowed origins/);
  });

  it('maps OAuth provider meta onto display name and username', () => {
    assert.match(authStore, /applyOAuthMeta/);
    assert.match(authStore, /meta\['name'\]/);
    assert.match(authStore, /meta\['username'\]/);
  });

  it('derives user-menu initials from username parts', () => {
    assert.match(initialsSrc, /silver-otter-1234.*SO/);
  });

  it('allows favoriting own snippets and bumps favoriteCount via relation id', () => {
    assert.match(
      migration,
      /name: 'favorites'[\s\S]*createRule: '@request\.auth\.id != "" && user = @request\.auth\.id'/
    );
    assert.doesNotMatch(migration, /snippet\.user != @request\.auth\.id/);
    assert.match(counters, /favoriteCount/);
    assert.match(util, /function relationId/);
  });

  it('locks private snippets, comment fields, view ledger, and svg uploads', () => {
    assert.match(tighten, /snippet\.isPrivate = false \|\| snippet\.user = @request\.auth\.id/);
    assert.match(tighten, /@request\.body\.user:isset = false/);
    assert.match(tighten, /@request\.body\.snippet:isset = false/);
    assert.match(tighten, /@request\.body\.content:isset = false/);
    assert.match(tighten, /follower != following/);
    assert.match(tighten, /snippetViews\.listRule = null/);
    assert.match(tighten, /snippetViews\.deleteRule = null/);
    const assetList = tighten.slice(
      tighten.indexOf('const ASSET_MIME'),
      tighten.indexOf('const PREVIOUS_ASSET_MIME')
    );
    assert.doesNotMatch(assetList, /svg/);
    assert.doesNotMatch(assetList, /octet-stream/);
    assert.match(tighten, /isAdmin:isset = false/);
  });

  it('does not return raw records from share or fork routes', () => {
    assert.match(routes, /publicSnippet/);
    assert.match(routes, /publicFiles/);
    assert.doesNotMatch(routes, /snippet: snippet/);
    assert.match(util, /function publicUser/);
    assert.doesNotMatch(util, /email:/);
    assert.match(util, /UPDATE /);
    assert.match(util, /COUNTER_FIELDS/);
    assert.match(counters, /assertCommentParent/);
  });

  it('documents schema, frontend wiring, and operator password reset', () => {
    assert.match(dbDoc, /Adding a collection or field/);
    assert.match(frontendDoc, /## Extending/);
    assert.match(frontendDoc, /OAUTH_PROVIDERS/);
    assert.match(readme, /reset-user-password/);
    assert.match(envExample, /PB_GOOGLE_CLIENT_ID/);
  });

  it('adds an owner-only isTemplate flag that forks never copy', () => {
    assert.match(templates, /new BoolField\(\{ name: 'isTemplate' \}\)/);
    assert.match(templates, /removeByName\('isTemplate'\)/);
    // Writes go through the existing snippets updateRule (owner only).
    assert.match(migration, /updateRule: `user = @request\.auth\.id && \$\{COUNTER_LOCK\}`/);
    const fork = routes.slice(routes.indexOf("'/api/snippy/snippets/{id}/fork'"));
    assert.doesNotMatch(fork.slice(0, fork.indexOf('txApp.save(copy)')), /isTemplate/);
  });

  it('marks forks parentDeleted before the parent relation is cleared', () => {
    assert.match(snippetsHook, /onRecordDelete\(\(e\) =>/);
    assert.doesNotMatch(snippetsHook, /onRecordAfterDeleteSuccess/);
    const hook = snippetsHook.slice(snippetsHook.indexOf('onRecordDelete'));
    const nextAt = hook.indexOf('e.next()');
    const filterAt = hook.indexOf('parentSnippet = {:id}');
    assert.ok(filterAt !== -1 && filterAt < nextAt);
    assert.match(hook.slice(nextAt), /parentDeleted/);
  });

  it('serves embeds only for public snippets', () => {
    const embed = routes.slice(
      routes.indexOf("'/api/snippy/embed/{shortId}'"),
      routes.indexOf('// Get a shared snippet by token.')
    );
    assert.match(embed, /get\('isPrivate'\) !== false/);
    assert.match(embed, /NotFoundError/);
    assert.match(embed, /no-store/);
    assert.match(embed, /publicSnippet/);
    assert.match(embed, /publicFiles/);
    assert.doesNotMatch(embed, /requireAuth/);
    assert.doesNotMatch(embed, /@request\.auth/);
    assert.doesNotMatch(embed, /get\('user'\)/);
  });

  it('serves a sitemap of public snippets from public profiles only', () => {
    const sitemap = routes.slice(
      routes.indexOf("'/api/snippy/sitemap.xml'"),
      routes.indexOf('// Get a shared snippet by token.')
    );
    assert.match(sitemap, /'isPrivate = false && user\.isPrivate = false'/);
    assert.match(sitemap, /application\/xml/);
    assert.match(sitemap, /xmlEscape\(base \+ entry\.loc\)/);
    assert.doesNotMatch(sitemap, /shareToken/);
  });
});
