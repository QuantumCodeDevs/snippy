/**
 * Theme/font keys stored on the PocketBase users.editorPreferences JSON field.
 * Do not extract a shared package — HTTP JSON is the contract.
 */
export const EDITOR_THEME_KEYS = [
  'one-dark',
  'light',
  'dracula',
  'github-dark',
  'solarized-dark',
  'solarized-light',
  'material-dark',
] as const;
export type EditorThemeKey = (typeof EDITOR_THEME_KEYS)[number];

export const EDITOR_FONT_KEYS = [
  'monospace',
  'fira-code',
  'jetbrains-mono',
  'source-code-pro',
] as const;
export type EditorFontKey = (typeof EDITOR_FONT_KEYS)[number];

export const EDITOR_KEYMAP_KEYS = ['default', 'vim'] as const;
export type EditorKeymapKey = (typeof EDITOR_KEYMAP_KEYS)[number];

export interface EditorPreferences {
  fontSize: number;
  fontFamily: EditorFontKey;
  indentWith: 'spaces' | 'tabs';
  indentWidth: number;
  lineNumbers: boolean;
  lineWrapping: boolean;
  codeFolding: boolean;
  autocomplete: boolean;
  matchBrackets: boolean;
  theme: EditorThemeKey;
  keymap: EditorKeymapKey;
}

export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
  fontSize: 15,
  fontFamily: 'source-code-pro',
  indentWith: 'spaces',
  indentWidth: 2,
  lineNumbers: true,
  lineWrapping: true,
  codeFolding: true,
  autocomplete: true,
  matchBrackets: true,
  theme: 'one-dark',
  keymap: 'default',
};

export function mergeEditorPreferences(stored: unknown): EditorPreferences {
  if (!stored || typeof stored !== 'object') {
    return { ...DEFAULT_EDITOR_PREFERENCES };
  }
  return {
    ...DEFAULT_EDITOR_PREFERENCES,
    ...(stored as Partial<EditorPreferences>),
  };
}

export const FONT_FAMILY_CSS: Record<EditorFontKey, string> = {
  monospace:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  'fira-code': '"Fira Code", ui-monospace, monospace',
  'jetbrains-mono': '"JetBrains Mono", ui-monospace, monospace',
  'source-code-pro': '"Source Code Pro", ui-monospace, monospace',
};

export const FONT_FAMILY_LABELS: Record<EditorFontKey, string> = {
  monospace: 'System monospace',
  'fira-code': 'Fira Code',
  'jetbrains-mono': 'JetBrains Mono',
  'source-code-pro': 'Source Code Pro',
};
