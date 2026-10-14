import { Extension } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
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

const lightTheme = EditorView.theme(
  {
    '&': {
      color: '#24292e',
      backgroundColor: '#ffffff',
    },
    '.cm-content': {
      caretColor: '#044289',
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: '#044289',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: '#c8e1ff',
    },
    '.cm-activeLine': {
      backgroundColor: '#f6f8fa',
    },
    '.cm-gutters': {
      backgroundColor: '#f6f8fa',
      color: '#6a737d',
      border: 'none',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#eaecef',
    },
  },
  { dark: false }
);

const draculaTheme = EditorView.theme(
  {
    '&': {
      color: '#f8f8f2',
      backgroundColor: '#282a36',
    },
    '.cm-content': {
      caretColor: '#f8f8f2',
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: '#f8f8f2',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: '#44475a',
    },
    '.cm-activeLine': {
      backgroundColor: '#44475a55',
    },
    '.cm-gutters': {
      backgroundColor: '#21222c',
      color: '#6272a4',
      border: 'none',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#44475a',
    },
  },
  { dark: true }
);

const githubDarkTheme = EditorView.theme(
  {
    '&': { color: '#e6edf3', backgroundColor: '#0d1117' },
    '.cm-content': { caretColor: '#e6edf3' },
    '&.cm-focused .cm-cursor': { borderLeftColor: '#e6edf3' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: '#264f78',
    },
    '.cm-activeLine': { backgroundColor: '#161b22' },
    '.cm-gutters': { backgroundColor: '#0d1117', color: '#7d8590', border: 'none' },
    '.cm-activeLineGutter': { backgroundColor: '#161b22' },
  },
  { dark: true }
);

const solarizedLightTheme = EditorView.theme(
  {
    '&': { color: '#586e75', backgroundColor: '#fdf6e3' },
    '.cm-content': { caretColor: '#657b83' },
    '&.cm-focused .cm-cursor': { borderLeftColor: '#657b83' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: '#eee8d5',
    },
    '.cm-activeLine': { backgroundColor: '#eee8d5' },
    '.cm-gutters': { backgroundColor: '#eee8d5', color: '#93a1a1', border: 'none' },
    '.cm-activeLineGutter': { backgroundColor: '#e7dbc3' },
  },
  { dark: false }
);

const solarizedDarkTheme = EditorView.theme(
  {
    '&': { color: '#839496', backgroundColor: '#002b36' },
    '.cm-content': { caretColor: '#93a1a1' },
    '&.cm-focused .cm-cursor': { borderLeftColor: '#93a1a1' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: '#073642',
    },
    '.cm-activeLine': { backgroundColor: '#073642' },
    '.cm-gutters': { backgroundColor: '#073642', color: '#586e75', border: 'none' },
    '.cm-activeLineGutter': { backgroundColor: '#0a3a45' },
  },
  { dark: true }
);

const materialDarkTheme = EditorView.theme(
  {
    '&': { color: '#eeffff', backgroundColor: '#263238' },
    '.cm-content': { caretColor: '#ffcc00' },
    '&.cm-focused .cm-cursor': { borderLeftColor: '#ffcc00' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: '#314549',
    },
    '.cm-activeLine': { backgroundColor: '#2c393f' },
    '.cm-gutters': { backgroundColor: '#263238', color: '#546e7a', border: 'none' },
    '.cm-activeLineGutter': { backgroundColor: '#37474f' },
  },
  { dark: true }
);

export interface SplitGutterColors {
  gutter: string;
  gutterHover: string;
}

export interface EditorThemeOption {
  key: EditorThemeKey;
  label: string;
  group: 'dark' | 'light';
  extension: Extension;
  gutter: string;
  gutterHover: string;
}

export const EDITOR_THEMES: EditorThemeOption[] = [
  {
    key: 'one-dark',
    label: 'One Dark',
    group: 'dark',
    extension: oneDark,
    gutter: DARK_GUTTER,
    gutterHover: DARK_GUTTER_HOVER,
  },
  {
    key: 'dracula',
    label: 'Dracula',
    group: 'dark',
    extension: [draculaTheme, highlightSyntax(DRACULA_SYNTAX)],
    gutter: DARK_GUTTER,
    gutterHover: DARK_GUTTER_HOVER,
  },
  {
    key: 'github-dark',
    label: 'GitHub Dark',
    group: 'dark',
    extension: [githubDarkTheme, highlightSyntax(GITHUB_DARK_SYNTAX)],
    gutter: DARK_GUTTER,
    gutterHover: DARK_GUTTER_HOVER,
  },
  {
    key: 'material-dark',
    label: 'Material Dark',
    group: 'dark',
    extension: [materialDarkTheme, highlightSyntax(MATERIAL_DARK_SYNTAX)],
    gutter: DARK_GUTTER,
    gutterHover: DARK_GUTTER_HOVER,
  },
  {
    key: 'solarized-dark',
    label: 'Solarized Dark',
    group: 'dark',
    extension: [solarizedDarkTheme, highlightSyntax(SOLARIZED_DARK_SYNTAX)],
    gutter: DARK_GUTTER,
    gutterHover: DARK_GUTTER_HOVER,
  },
  {
    key: 'light',
    label: 'Light',
    group: 'light',
    extension: [lightTheme, highlightSyntax(LIGHT_SYNTAX)],
    gutter: LIGHT_GUTTER,
    gutterHover: LIGHT_GUTTER_HOVER,
  },
  {
    key: 'solarized-light',
    label: 'Solarized Light',
    group: 'light',
    extension: [solarizedLightTheme, highlightSyntax(SOLARIZED_LIGHT_SYNTAX)],
    gutter: LIGHT_GUTTER,
    gutterHover: LIGHT_GUTTER_HOVER,
  },
];

const DEFAULT_GUTTERS: SplitGutterColors = {
  gutter: DARK_GUTTER,
  gutterHover: DARK_GUTTER_HOVER,
};

export function getThemeExtension(themeKey: string): Extension {
  return EDITOR_THEMES.find((t) => t.key === themeKey)?.extension ?? oneDark;
}

export function getSplitGutterColors(themeKey: string): SplitGutterColors {
  const theme = EDITOR_THEMES.find((t) => t.key === themeKey);
  if (!theme) return DEFAULT_GUTTERS;
  return { gutter: theme.gutter, gutterHover: theme.gutterHover };
}
