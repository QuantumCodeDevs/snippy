/// <reference path="../pb_data/types.d.ts" />

const ADJECTIVES = [
  'silver',
  'blue',
  'brave',
  'clever',
  'happy',
  'swift',
  'bright',
  'calm',
  'lucky',
  'gentle',
];
const NOUNS = ['otter', 'falcon', 'lion', 'panda', 'wolf', 'fox', 'tiger', 'hawk', 'bear', 'eagle'];

function slugFromName(name) {
  return String(name || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
    .slice(0, 20);
}

function randomUsername(base) {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  const cleaned = slugFromName(base);
  if (cleaned) return `${cleaned}${suffix}`;
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}-${noun}-${suffix}`;
}

function usernameTaken(app, name, exceptId) {
  try {
    const rec = app.findFirstRecordByFilter('users', 'username = {:name}', { name });
    return rec && rec.id !== exceptId;
  } catch (err) {
    return false;
  }
}

function uniqueUsername(app, preferred, exceptId) {
  if (preferred && !usernameTaken(app, preferred, exceptId)) return preferred;
  for (let i = 0; i < 12; i++) {
    const candidate = randomUsername(preferred);
    if (!usernameTaken(app, candidate, exceptId)) return candidate;
  }
  return `user-${Date.now()}`;
}

migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  const username = users.fields.getByName('username');
  if (username) {
    username.autogeneratePattern = '[a-z]{5}[0-9]{4}';
    username.min = 2;
    username.max = 32;
    username.pattern = '^[a-zA-Z0-9_][a-zA-Z0-9_-]{1,31}$';
    app.save(users);
  }

  let records = [];
  try {
    records = app.findRecordsByFilter('users', 'id != ""', '', 5000, 0);
  } catch (err) {
    records = [];
  }
  for (const rec of records) {
    let changed = false;
    if (!rec.getString('username')) {
      rec.set('username', uniqueUsername(app, rec.getString('name') || rec.getString('email'), rec.id));
      changed = true;
    }
    if (!rec.getString('name')) {
      rec.set('name', rec.getString('username'));
      changed = true;
    }
    if (rec.get('isPrivate') === null || rec.get('isPrivate') === undefined) {
      rec.set('isPrivate', false);
      changed = true;
    }
    if (changed) app.save(rec);
  }
});
