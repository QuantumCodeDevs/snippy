import {
  SHORTCUTS,
  findShortcut,
  formatCombo,
  isTypingTarget,
  matchesCombo,
  shortcutHint,
} from '@app/shortcuts/keyboard-shortcuts';

function key(init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent('keydown', init);
}

describe('keyboard-shortcuts', () => {
  it('has no two shortcuts sharing a key combination', () => {
    const seen = new Set<string>();
    for (const s of SHORTCUTS) {
      for (const c of s.combos) {
        const id = JSON.stringify([c.key?.toLowerCase(), c.code, !!c.mod, !!c.alt, c.shift]);
        expect(seen.has(id), `${s.id} reuses ${id}`).toBe(false);
        seen.add(id);
      }
    }
  });

  describe('matchesCombo', () => {
    it('treats Ctrl and Cmd as the same modifier', () => {
      expect(matchesCombo(key({ key: 's', ctrlKey: true }), { key: 's', mod: true })).toBe(true);
      expect(matchesCombo(key({ key: 's', metaKey: true }), { key: 's', mod: true })).toBe(true);
    });

    it('rejects extra or missing modifiers', () => {
      expect(matchesCombo(key({ key: 's' }), { key: 's', mod: true })).toBe(false);
      expect(
        matchesCombo(key({ key: 'S', ctrlKey: true, shiftKey: true }), { key: 's', mod: true })
      ).toBe(false);
      expect(
        matchesCombo(key({ key: 's', ctrlKey: true, altKey: true }), { key: 's', mod: true })
      ).toBe(false);
    });

    it('matches by code so Alt/Option characters do not matter', () => {
      expect(
        matchesCombo(key({ key: '˜', code: 'KeyN', altKey: true }), { code: 'KeyN', alt: true })
      ).toBe(true);
    });

    it('accepts ? with or without Shift (layout dependent)', () => {
      expect(matchesCombo(key({ key: '?', shiftKey: true }), { key: '?' })).toBe(true);
      expect(matchesCombo(key({ key: '?' }), { key: '?' })).toBe(true);
    });

    it('ignores AltGr, which types characters on Windows layouts', () => {
      const event = key({ key: '2', code: 'Digit2', ctrlKey: true, altKey: true });
      Object.defineProperty(event, 'getModifierState', {
        value: (k: string) => k === 'AltGraph',
      });
      expect(matchesCombo(event, { code: 'Digit2', mod: true, alt: true })).toBe(false);
    });
  });

  describe('findShortcut', () => {
    it.each([
      [{ key: 'k', ctrlKey: true }, 'command-palette'],
      [{ key: 's', ctrlKey: true }, 'save'],
      [{ key: 'e', metaKey: true }, 'export'],
      [{ key: ',', ctrlKey: true }, 'snippet-settings'],
      [{ key: '`', code: 'Backquote', ctrlKey: true }, 'toggle-console'],
      [{ key: 'Enter', code: 'Enter', altKey: true }, 'rerun-preview'],
      [{ key: 'F', code: 'KeyF', altKey: true, shiftKey: true }, 'format-pane'],
      [{ key: 'n', code: 'KeyN', altKey: true }, 'new-snippet'],
      [{ key: 'n', code: 'KeyN', ctrlKey: true }, 'new-snippet'],
      [{ key: '1', code: 'Digit1', ctrlKey: true, altKey: true }, 'focus-html'],
      [{ key: '3', code: 'Digit3', ctrlKey: true, altKey: true }, 'focus-js'],
      [{ key: '?', shiftKey: true }, 'shortcuts'],
    ] as [KeyboardEventInit, string][])('%o → %s', (init, id) => {
      expect(findShortcut(key(init))?.id).toBe(id);
    });

    it('returns undefined for plain typing', () => {
      expect(findShortcut(key({ key: 'a' }))).toBeUndefined();
      expect(findShortcut(key({ key: 'f', ctrlKey: true }))).toBeUndefined();
    });
  });

  describe('formatCombo', () => {
    it('formats for Windows/Linux', () => {
      expect(formatCombo({ key: 's', mod: true }, false)).toBe('Ctrl+S');
      expect(formatCombo({ code: 'KeyF', alt: true, shift: true }, false)).toBe('Alt+Shift+F');
      expect(formatCombo({ code: 'Backquote', mod: true }, false)).toBe('Ctrl+`');
      expect(formatCombo({ code: 'Digit2', mod: true, alt: true }, false)).toBe('Ctrl+Alt+2');
      expect(formatCombo({ key: '?' }, false)).toBe('?');
    });

    it('formats for macOS with symbols', () => {
      expect(formatCombo({ key: 's', mod: true }, true)).toBe('⌘S');
      expect(formatCombo({ code: 'KeyF', alt: true, shift: true }, true)).toBe('⌥⇧F');
    });

    it('shortcutHint uses the first combo', () => {
      expect(shortcutHint('new-snippet', false)).toBe('Alt+N');
      expect(shortcutHint('export', false)).toBe('Ctrl+E');
    });
  });

  it('isTypingTarget recognises fields and contenteditable', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    Object.defineProperty(editable, 'isContentEditable', { value: true });
    expect(isTypingTarget(input)).toBe(true);
    expect(isTypingTarget(textarea)).toBe(true);
    expect(isTypingTarget(editable)).toBe(true);
    expect(isTypingTarget(document.createElement('button'))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
