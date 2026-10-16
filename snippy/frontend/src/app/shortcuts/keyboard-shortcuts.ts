/**
 * Single source of truth for Snippy's keyboard shortcuts. The global handler,
 * the shortcuts dialog, the settings list, and command palette hints all read
 * from here, so a binding is documented wherever it works.
 */

export type ShortcutGroup = 'General' | 'Snippet editor' | 'Code panes';

/** One physical key combination. `mod` is Ctrl on Windows/Linux and Cmd on macOS. */
export interface KeyCombo {
  /** `KeyboardEvent.key` (case-insensitive). Use for printable keys like `?` or `,`. */
  key?: string;
  /** `KeyboardEvent.code`. Use when Alt/Option changes the produced character. */
  code?: string;
  mod?: boolean;
  alt?: boolean;
  shift?: boolean;
}

export type ShortcutId =
  | 'command-palette'
  | 'shortcuts'
  | 'new-snippet'
  | 'save'
  | 'export'
  | 'snippet-settings'
  | 'toggle-console'
  | 'rerun-preview'
  | 'format-pane'
  | 'focus-html'
  | 'focus-css'
  | 'focus-js';

export interface ShortcutDef {
  id: ShortcutId;
  label: string;
  group: ShortcutGroup;
  combos: KeyCombo[];
  /** Fires even while typing in an input or the code editor. */
  allowInFields: boolean;
  note?: string;
}

/** Bindings Snippy handles itself. */
export const SHORTCUTS: ShortcutDef[] = [
  {
    id: 'command-palette',
    label: 'Command palette',
    group: 'General',
    combos: [{ key: 'k', mod: true }],
    allowInFields: true,
  },
  {
    id: 'shortcuts',
    label: 'Keyboard shortcuts',
    group: 'General',
    combos: [{ key: '?' }],
    allowInFields: false,
  },
  {
    id: 'new-snippet',
    label: 'New snippet',
    group: 'General',
    combos: [
      { code: 'KeyN', alt: true },
      { code: 'KeyN', mod: true },
    ],
    allowInFields: true,
    note: 'Chrome and Edge keep Ctrl+N for a new window, so use Alt+N there.',
  },
  {
    id: 'save',
    label: 'Save snippet',
    group: 'Snippet editor',
    combos: [{ key: 's', mod: true }],
    allowInFields: true,
  },
  {
    id: 'export',
    label: 'Export as ZIP',
    group: 'Snippet editor',
    combos: [{ key: 'e', mod: true }],
    allowInFields: true,
  },
  {
    id: 'snippet-settings',
    label: 'Snippet settings',
    group: 'Snippet editor',
    combos: [{ key: ',', mod: true }],
    allowInFields: true,
  },
  {
    id: 'toggle-console',
    label: 'Toggle console',
    group: 'Snippet editor',
    combos: [{ code: 'Backquote', mod: true }],
    allowInFields: true,
  },
  {
    id: 'rerun-preview',
    label: 'Re-run preview',
    group: 'Snippet editor',
    combos: [{ code: 'Enter', alt: true }],
    allowInFields: true,
  },
  {
    id: 'format-pane',
    label: 'Format current pane',
    group: 'Snippet editor',
    combos: [{ code: 'KeyF', alt: true, shift: true }],
    allowInFields: true,
  },
  {
    id: 'focus-html',
    label: 'Focus HTML pane',
    group: 'Snippet editor',
    combos: [{ code: 'Digit1', mod: true, alt: true }],
    allowInFields: true,
  },
  {
    id: 'focus-css',
    label: 'Focus CSS pane',
    group: 'Snippet editor',
    combos: [{ code: 'Digit2', mod: true, alt: true }],
    allowInFields: true,
  },
  {
    id: 'focus-js',
    label: 'Focus JS pane',
    group: 'Snippet editor',
    combos: [{ code: 'Digit3', mod: true, alt: true }],
    allowInFields: true,
  },
];

/** CodeMirror bindings inside a code pane (documented only; CodeMirror handles them). */
export const CODE_PANE_SHORTCUTS: { label: string; combos: KeyCombo[] }[] = [
  { label: 'Find', combos: [{ key: 'f', mod: true }] },
  { label: 'Find & replace', combos: [{ key: 'h', mod: true }] },
  {
    label: 'Next / previous match',
    combos: [
      { key: 'g', mod: true },
      { key: 'g', mod: true, shift: true },
    ],
  },
  { label: 'Select all matches', combos: [{ key: 'l', mod: true, shift: true }] },
  { label: 'Select next occurrence', combos: [{ key: 'd', mod: true }] },
  { label: 'Go to line', combos: [{ key: 'g', mod: true, alt: true }] },
  { label: 'Toggle comment', combos: [{ key: '/', mod: true }] },
  {
    label: 'Move line up / down',
    combos: [
      { key: '↑', alt: true },
      { key: '↓', alt: true },
    ],
  },
  {
    label: 'Indent / outdent',
    combos: [
      { key: ']', mod: true },
      { key: '[', mod: true },
    ],
  },
  {
    label: 'Undo / redo',
    combos: [
      { key: 'z', mod: true },
      { key: 'z', mod: true, shift: true },
    ],
  },
  { label: 'Close search panel', combos: [{ key: 'Esc' }] },
];

export function shortcutById(id: ShortcutId): ShortcutDef {
  return SHORTCUTS.find((s) => s.id === id)!;
}

/** True on macOS / iOS, where `mod` means Cmd. */
export function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    navigator.platform ||
    navigator.userAgent;
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/** Does `event` match `combo` exactly (no extra modifiers)? */
export function matchesCombo(event: KeyboardEvent, combo: KeyCombo): boolean {
  const mod = event.ctrlKey || event.metaKey;
  if (!!combo.mod !== mod) return false;
  if (!!combo.alt !== event.altKey) return false;
  // AltGr reports Ctrl+Alt on Windows; it types characters, not shortcuts.
  if (event.getModifierState?.('AltGraph')) return false;
  // Symbols like `?` need Shift on some layouts and not others, so Shift is
  // only checked for them when the combo asks for it.
  const symbolKey = !combo.code && !!combo.key && !/^[a-z0-9]$/i.test(combo.key);
  if (!(symbolKey && combo.shift === undefined) && !!combo.shift !== event.shiftKey) {
    return false;
  }
  if (combo.code) return event.code === combo.code;
  return !!combo.key && event.key.toLowerCase() === combo.key.toLowerCase();
}

/** The first registered shortcut that matches `event`, if any. */
export function findShortcut(event: KeyboardEvent): ShortcutDef | undefined {
  return SHORTCUTS.find((s) => s.combos.some((c) => matchesCombo(event, c)));
}

const CODE_LABELS: Record<string, string> = {
  Backquote: '`',
  Enter: 'Enter',
};

/** Human label for a combo, e.g. `Ctrl+Shift+F` or `⌘⇧F`. */
export function formatCombo(combo: KeyCombo, apple = isApplePlatform()): string {
  const keyName = combo.code
    ? (CODE_LABELS[combo.code] ?? combo.code.replace(/^(Key|Digit)/, ''))
    : combo.key!.length === 1
      ? combo.key!.toUpperCase()
      : combo.key!;
  const parts: string[] = [];
  if (combo.mod) parts.push(apple ? '⌘' : 'Ctrl');
  if (combo.alt) parts.push(apple ? '⌥' : 'Alt');
  // `?` already implies Shift, so do not print it twice.
  if (combo.shift && keyName !== '?') parts.push(apple ? '⇧' : 'Shift');
  parts.push(keyName);
  return apple ? parts.join('') : parts.join('+');
}

/** Primary combo label for palette hints and tooltips. */
export function shortcutHint(id: ShortcutId, apple = isApplePlatform()): string {
  return formatCombo(shortcutById(id).combos[0], apple);
}

/** Keys typed into a field should not trigger single-key shortcuts like `?`. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}
