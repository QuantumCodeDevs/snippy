import { syntaxHighlighting } from '@codemirror/language';
import { Extension } from '@codemirror/state';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { EditorThemeKey } from '../editor-preferences';
import {
  DRACULA_SYNTAX,
  GITHUB_DARK_SYNTAX,
  LIGHT_SYNTAX,
  MATERIAL_DARK_SYNTAX,
  SOLARIZED_DARK_SYNTAX,
  SOLARIZED_LIGHT_SYNTAX,
  highlightSyntax,
} from './highlight';

const DARK_GUTTER = 'rgba(255, 255, 255, 0.06)';
const DARK_GUTTER_HOVER = 'rgba(255, 255, 255, 0.12)';
const LIGHT_GUTTER = 'rgba(0, 0, 0, 0.06)';
const LIGHT_GUTTER_HOVER = 'rgba(0, 0, 0, 0.12)';

/** Chrome colors for one editor theme. Syntax colors live in `highlight.ts`. */
export interface EditorChromeColors {
  dark: boolean;
  background: string;
  foreground: string;
  caret: string;
  /** Drawn selection. Must differ clearly from `background` and `activeLine`. */
  selection: string;
  /** Translucent. The active line paints above the selection layer. */
  activeLine: string;
  gutterBackground: string;
  gutterForeground: string;
  activeLineGutter: string;
  panelBackground: string;
  panelBorder: string;
  fieldBackground: string;
  accent: string;
  searchMatch: string;
  searchMatchSelected: string;
  selectionMatch: string;
}

/**
 * Selection selectors must match the specificity of the base theme
 * (`&light.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground`).
 * A shorter selector loses to it, and focused selections fall back to the
 * near-invisible base color.
 */
const SELECTION_SELECTOR =
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection';

/** Build the editor chrome (selection, gutters, search panel, tooltips) for one palette. */
export function editorChromeTheme(c: EditorChromeColors): Extension {
  return EditorView.theme(
    {
      '&': { color: c.foreground, backgroundColor: c.background },
      '.cm-content': { caretColor: c.caret },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: c.caret },
      '&.cm-focused .cm-cursor': { borderLeftColor: c.caret },
      [SELECTION_SELECTOR]: { backgroundColor: c.selection },
      '.cm-activeLine': { backgroundColor: c.activeLine },
      '.cm-selectionMatch': { backgroundColor: c.selectionMatch },
      '.cm-searchMatch': {
        backgroundColor: c.searchMatch,
        outline: `1px solid ${c.accent}55`,
        borderRadius: '2px',
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: c.searchMatchSelected,
        outline: `1px solid ${c.accent}`,
      },
      '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
        backgroundColor: c.selectionMatch,
      },
      '.cm-gutters': {
        backgroundColor: c.gutterBackground,
        color: c.gutterForeground,
        border: 'none',
      },
      '.cm-activeLineGutter': { backgroundColor: c.activeLineGutter },
      '.cm-foldPlaceholder': {
        backgroundColor: 'transparent',
        border: 'none',
        color: c.gutterForeground,
      },
      '.cm-tooltip': {
        backgroundColor: c.panelBackground,
        color: c.foreground,
        border: `1px solid ${c.panelBorder}`,
        borderRadius: '6px',
      },
      '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
        backgroundColor: c.selection,
        color: c.foreground,
      },
      '.cm-panels': {
        backgroundColor: c.panelBackground,
        color: c.foreground,
      },
      '.cm-panels.cm-panels-top': { borderBottom: `1px solid ${c.panelBorder}` },
      '.cm-panels.cm-panels-bottom': { borderTop: `1px solid ${c.panelBorder}` },
      '.cm-panel.cm-search': {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.5rem 2.25rem 0.5rem 0.625rem',
        fontSize: '0.8125rem',
      },
      '.cm-panel.cm-search br': { flexBasis: '100%', height: 0, content: '""' },
      '.cm-panel.cm-search input, .cm-panel.cm-search button, .cm-panel.cm-search label': {
        margin: 0,
      },
      '.cm-panel.cm-search .cm-textfield': {
        minWidth: '9rem',
        flex: '1 1 9rem',
        maxWidth: '18rem',
        padding: '0.3rem 0.5rem',
        borderRadius: '6px',
        border: `1px solid ${c.panelBorder}`,
        backgroundColor: c.fieldBackground,
        color: c.foreground,
        fontSize: '0.8125rem',
      },
      '.cm-panel.cm-search .cm-textfield:focus': {
        outline: `2px solid ${c.accent}`,
        outlineOffset: '-1px',
        borderColor: 'transparent',
      },
      '.cm-panel.cm-search .cm-button': {
        padding: '0.3rem 0.625rem',
        borderRadius: '6px',
        border: `1px solid ${c.panelBorder}`,
        backgroundColor: 'transparent',
        backgroundImage: 'none',
        color: c.foreground,
        fontSize: '0.75rem',
        textTransform: 'capitalize',
        cursor: 'pointer',
      },
      '.cm-panel.cm-search .cm-button:hover': { backgroundColor: c.activeLineGutter },
      '.cm-panel.cm-search .cm-button:focus-visible': {
        outline: `2px solid ${c.accent}`,
        outlineOffset: '1px',
      },
      '.cm-panel.cm-search label': {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontSize: '0.75rem',
        color: c.gutterForeground,
        cursor: 'pointer',
      },
      '.cm-panel.cm-search input[type=checkbox]': { accentColor: c.accent, margin: 0 },
      '.cm-panel.cm-search [name=close]': {
        top: '0.375rem',
        right: '0.5rem',
        width: '1.5rem',
        height: '1.5rem',
        borderRadius: '6px',
        color: c.gutterForeground,
        fontSize: '1.125rem',
        lineHeight: '1',
        cursor: 'pointer',
      },
      '.cm-panel.cm-search [name=close]:hover': {
        backgroundColor: c.activeLineGutter,
        color: c.foreground,
      },
      '.cm-panel.cm-gotoLine': { padding: '0.5rem 0.625rem' },
      '.cm-panel.cm-gotoLine .cm-textfield': {
        borderRadius: '6px',
        border: `1px solid ${c.panelBorder}`,
        backgroundColor: c.fieldBackground,
        color: c.foreground,
      },
    },
    { dark: c.dark }
  );
}

export const ONE_DARK_CHROME: EditorChromeColors = {
  dark: true,
  background: '#282c34',
  foreground: '#abb2bf',
  caret: '#528bff',
  selection: '#3e4451',
  activeLine: '#6699ff0b',
  gutterBackground: '#282c34',
  gutterForeground: '#7d8799',
  activeLineGutter: '#2c313a',
  panelBackground: '#21252b',
  panelBorder: '#3b4048',
  fieldBackground: '#1b1f24',
  accent: '#61afef',
  searchMatch: '#72a1ff59',
  searchMatchSelected: '#6199ff2f',
  selectionMatch: '#aafe661a',
};

export const LIGHT_CHROME: EditorChromeColors = {
  dark: false,
  background: '#ffffff',
  foreground: '#24292e',
  caret: '#044289',
  selection: '#add6ff',
  activeLine: 'rgba(3, 102, 214, 0.05)',
  gutterBackground: '#f6f8fa',
  gutterForeground: '#6a737d',
  activeLineGutter: '#eaecef',
  panelBackground: '#f6f8fa',
  panelBorder: '#d0d7de',
  fieldBackground: '#ffffff',
  accent: '#0969da',
  searchMatch: '#fff8c5',
  searchMatchSelected: '#ffd33d99',
  selectionMatch: '#34d05833',
};

export const DRACULA_CHROME: EditorChromeColors = {
  dark: true,
  background: '#282a36',
  foreground: '#f8f8f2',
  caret: '#f8f8f2',
  selection: '#515779',
  activeLine: 'rgba(255, 255, 255, 0.04)',
  gutterBackground: '#21222c',
  gutterForeground: '#6272a4',
  activeLineGutter: '#343746',
  panelBackground: '#21222c',
  panelBorder: '#44475a',
  fieldBackground: '#191a21',
  accent: '#bd93f9',
  searchMatch: '#ffb86c40',
  searchMatchSelected: '#ffb86c80',
  selectionMatch: '#8be9fd26',
};

export const GITHUB_DARK_CHROME: EditorChromeColors = {
  dark: true,
  background: '#0d1117',
  foreground: '#e6edf3',
  caret: '#e6edf3',
  selection: '#264f78',
  activeLine: 'rgba(110, 118, 129, 0.1)',
  gutterBackground: '#0d1117',
  gutterForeground: '#7d8590',
  activeLineGutter: '#161b22',
  panelBackground: '#161b22',
  panelBorder: '#30363d',
  fieldBackground: '#0d1117',
  accent: '#2f81f7',
  searchMatch: '#9e6a0366',
  searchMatchSelected: '#f2cc6080',
  selectionMatch: '#3fb95033',
};

export const MATERIAL_DARK_CHROME: EditorChromeColors = {
  dark: true,
  background: '#263238',
  foreground: '#eeffff',
  caret: '#ffcc00',
  selection: '#80cbc440',
  activeLine: 'rgba(255, 255, 255, 0.04)',
  gutterBackground: '#263238',
  gutterForeground: '#546e7a',
  activeLineGutter: '#2f3e45',
  panelBackground: '#1e272c',
  panelBorder: '#37474f',
  fieldBackground: '#192227',
  accent: '#80cbc4',
  searchMatch: '#ffcb6b40',
  searchMatchSelected: '#ffcb6b80',
  selectionMatch: '#c792ea26',
};

export const SOLARIZED_DARK_CHROME: EditorChromeColors = {
  dark: true,
  background: '#002b36',
  foreground: '#839496',
  caret: '#93a1a1',
  selection: '#1c5463',
  activeLine: 'rgba(147, 161, 161, 0.06)',
  gutterBackground: '#073642',
  gutterForeground: '#586e75',
  activeLineGutter: '#0a3a45',
  panelBackground: '#073642',
  panelBorder: '#164a57',
  fieldBackground: '#002b36',
  accent: '#268bd2',
  searchMatch: '#b5890040',
  searchMatchSelected: '#b5890080',
  selectionMatch: '#2aa19826',
};

export const SOLARIZED_LIGHT_CHROME: EditorChromeColors = {
  dark: false,
  background: '#fdf6e3',
  foreground: '#586e75',
  caret: '#657b83',
  selection: '#d6cdb0',
  activeLine: 'rgba(147, 161, 161, 0.1)',
  gutterBackground: '#eee8d5',
  gutterForeground: '#93a1a1',
  activeLineGutter: '#e7dbc3',
  panelBackground: '#eee8d5',
  panelBorder: '#d9cfb3',
  fieldBackground: '#fdf6e3',
  accent: '#268bd2',
  searchMatch: '#b5890033',
  searchMatchSelected: '#cb4b1640',
  selectionMatch: '#2aa19826',
};

export interface SplitGutterColors {
  gutter: string;
  gutterHover: string;
}

export interface EditorThemeOption {
  key: EditorThemeKey;
  label: string;
  group: 'dark' | 'light';
  chrome: EditorChromeColors;
  extension: Extension;
  gutter: string;
  gutterHover: string;
}

export const EDITOR_THEMES: EditorThemeOption[] = [
  {
    key: 'one-dark',
    label: 'One Dark',
    group: 'dark',
    chrome: ONE_DARK_CHROME,
    extension: [editorChromeTheme(ONE_DARK_CHROME), syntaxHighlighting(oneDarkHighlightStyle)],
    gutter: DARK_GUTTER,
    gutterHover: DARK_GUTTER_HOVER,
  },
  {
    key: 'dracula',
    label: 'Dracula',
    group: 'dark',
    chrome: DRACULA_CHROME,
    extension: [editorChromeTheme(DRACULA_CHROME), highlightSyntax(DRACULA_SYNTAX)],
    gutter: DARK_GUTTER,
    gutterHover: DARK_GUTTER_HOVER,
  },
  {
    key: 'github-dark',
    label: 'GitHub Dark',
    group: 'dark',
    chrome: GITHUB_DARK_CHROME,
    extension: [editorChromeTheme(GITHUB_DARK_CHROME), highlightSyntax(GITHUB_DARK_SYNTAX)],
    gutter: DARK_GUTTER,
    gutterHover: DARK_GUTTER_HOVER,
  },
  {
    key: 'material-dark',
    label: 'Material Dark',
    group: 'dark',
    chrome: MATERIAL_DARK_CHROME,
    extension: [editorChromeTheme(MATERIAL_DARK_CHROME), highlightSyntax(MATERIAL_DARK_SYNTAX)],
    gutter: DARK_GUTTER,
    gutterHover: DARK_GUTTER_HOVER,
  },
  {
    key: 'solarized-dark',
    label: 'Solarized Dark',
    group: 'dark',
    chrome: SOLARIZED_DARK_CHROME,
    extension: [editorChromeTheme(SOLARIZED_DARK_CHROME), highlightSyntax(SOLARIZED_DARK_SYNTAX)],
    gutter: DARK_GUTTER,
    gutterHover: DARK_GUTTER_HOVER,
  },
  {
    key: 'light',
    label: 'Light',
    group: 'light',
    chrome: LIGHT_CHROME,
    extension: [editorChromeTheme(LIGHT_CHROME), highlightSyntax(LIGHT_SYNTAX)],
    gutter: LIGHT_GUTTER,
    gutterHover: LIGHT_GUTTER_HOVER,
  },
  {
    key: 'solarized-light',
    label: 'Solarized Light',
    group: 'light',
    chrome: SOLARIZED_LIGHT_CHROME,
    extension: [editorChromeTheme(SOLARIZED_LIGHT_CHROME), highlightSyntax(SOLARIZED_LIGHT_SYNTAX)],
    gutter: LIGHT_GUTTER,
    gutterHover: LIGHT_GUTTER_HOVER,
  },
];

const DEFAULT_GUTTERS: SplitGutterColors = {
  gutter: DARK_GUTTER,
  gutterHover: DARK_GUTTER_HOVER,
};

export function getThemeExtension(themeKey: string): Extension {
  return (EDITOR_THEMES.find((t) => t.key === themeKey) ?? EDITOR_THEMES[0]).extension;
}

export function getSplitGutterColors(themeKey: string): SplitGutterColors {
  const theme = EDITOR_THEMES.find((t) => t.key === themeKey);
  if (!theme) return DEFAULT_GUTTERS;
  return { gutter: theme.gutter, gutterHover: theme.gutterHover };
}
