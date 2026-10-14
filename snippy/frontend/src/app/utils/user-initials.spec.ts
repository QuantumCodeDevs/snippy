import { isPlaceholderUsername, slugUsername, userInitials } from './user-initials';

describe('userInitials', () => {
  it('uses two alphanumeric parts of the username', () => {
    expect(userInitials('silver-otter-1234')).toBe('SO');
  });

  it('falls back to display name, then ?', () => {
    expect(userInitials('', 'Ada Lovelace')).toBe('AL');
    expect(userInitials(null, null)).toBe('?');
  });
});

describe('slugUsername', () => {
  it('keeps a valid GitHub-style login', () => {
    expect(slugUsername('octocat')).toBe('octocat');
  });

  it('rejects strings that cannot form a valid username', () => {
    expect(slugUsername('a')).toBe('');
    expect(slugUsername('@@@')).toBe('');
  });
});

describe('isPlaceholderUsername', () => {
  it('matches generated email-signup handles', () => {
    expect(isPlaceholderUsername('silver-otter-1234')).toBe(true);
    expect(isPlaceholderUsername('abcde1234')).toBe(true);
    expect(isPlaceholderUsername('octocat')).toBe(false);
  });
});
