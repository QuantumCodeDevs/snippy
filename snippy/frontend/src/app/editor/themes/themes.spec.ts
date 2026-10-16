import { EDITOR_THEMES, getSplitGutterColors, getThemeExtension } from '@app/editor/themes';
import { EDITOR_THEME_KEYS } from '@app/editor/editor-preferences';

/** True when a CSS color carries an alpha channel below 1. */
function isTranslucent(color: string): boolean {
  const hex = color.match(/^#([0-9a-f]{8}|[0-9a-f]{4})$/i);
  if (hex) {
    const alpha = hex[1].length === 8 ? hex[1].slice(6) : hex[1].slice(3).repeat(2);
    return parseInt(alpha, 16) < 255;
  }
  const rgba = color.match(/^rgba\(.*,\s*([\d.]+)\)$/i);
  return !!rgba && parseFloat(rgba[1]) < 1;
}

/** CSS rules of every StyleModule inside an extension tree (no DOM needed). */
function themeRules(ext: unknown, seen = new Set<unknown>()): string[] {
  if (!ext || typeof ext !== 'object' || seen.has(ext)) return [];
  seen.add(ext);
  if (Array.isArray(ext)) return ext.flatMap((e) => themeRules(e, seen));
  const obj = ext as { rules?: unknown; value?: unknown; inner?: unknown; extension?: unknown };
  if (Array.isArray(obj.rules) && obj.rules.every((r) => typeof r === 'string')) {
    return obj.rules as string[];
  }
  return [obj.value, obj.inner, obj.extension].flatMap((e) => themeRules(e, seen));
}

describe('editor themes', () => {
  it('covers every stored theme key', () => {
    expect(EDITOR_THEMES.map((t) => t.key).sort()).toEqual([...EDITOR_THEME_KEYS].sort());
  });

  describe.each(EDITOR_THEMES.map((t) => [t.key, t] as const))('%s', (_key, theme) => {
    it('has a selection color distinct from the background and active line', () => {
      const c = theme.chrome;
      expect(c.selection.toLowerCase()).not.toBe(c.background.toLowerCase());
      expect(c.selection.toLowerCase()).not.toBe(c.activeLine.toLowerCase());
      expect(c.selection.toLowerCase()).not.toBe(c.gutterBackground.toLowerCase());
    });

    it('uses a translucent active line so it cannot hide the selection', () => {
      expect(isTranslucent(theme.chrome.activeLine)).toBe(true);
    });

    it('matches the declared light/dark group', () => {
      expect(theme.chrome.dark).toBe(theme.group === 'dark');
    });
  });

  it.each(EDITOR_THEMES.map((t) => [t.key, t] as const))(
    '%s: focused selection rule is as specific as the base theme',
    (_key, theme) => {
      // Base theme: `.ͼ2.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground`.
      // A shorter selector loses and the focused selection turns near-invisible.
      const rule = themeRules(theme.extension).find(
        (r) =>
          r.includes('.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground') &&
          r.includes(`background-color: ${theme.chrome.selection}`)
      );
      expect(rule).toBeTruthy();
    }
  );

  it('falls back to One Dark for unknown keys', () => {
    expect(getThemeExtension('nope')).toBe(EDITOR_THEMES[0].extension);
    expect(getSplitGutterColors('nope')).toEqual(getSplitGutterColors('one-dark'));
    expect(getSplitGutterColors('light').gutter).toContain('0, 0, 0');
  });
});
