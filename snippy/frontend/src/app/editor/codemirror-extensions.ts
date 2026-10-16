import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
} from '@codemirror/language';
import {
  highlightSelectionMatches,
  openSearchPanel,
  search,
  searchKeymap,
} from '@codemirror/search';
import { EditorState, Extension } from '@codemirror/state';
import {
  EditorView,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view';
import { EditorPreferences, FONT_FAMILY_CSS, EditorFontKey } from './editor-preferences';
import { getThemeExtension } from './themes';
import { vim } from '@replit/codemirror-vim';

/**
 * Open CodeMirror's find/replace panel. With `focusReplace`, the caret lands in
 * the replace field, so Ctrl+H goes straight to replacing.
 */
export function openFindReplace(view: EditorView, focusReplace = false): boolean {
  openSearchPanel(view);
  if (focusReplace) {
    const field = view.dom.querySelector<HTMLInputElement>('.cm-search input[name=replace]');
    field?.focus();
    field?.select();
  }
  return true;
}

/** Ctrl/Cmd+H opens find/replace with the replace field focused. */
const findReplaceKeymap = [
  { key: 'Mod-h', run: (view: EditorView) => openFindReplace(view, true), preventDefault: true },
];

function resolveFontFamily(fontFamily: string): string {
  return FONT_FAMILY_CSS[fontFamily as EditorFontKey] ?? FONT_FAMILY_CSS.monospace;
}

/** Core editor chrome that is always on (history, selection, keymaps, etc.). */
export function baseEditorExtensions(): Extension[] {
  return [
    highlightSpecialChars(),
    history(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    highlightSelectionMatches(),
    search({ top: true }),
    keymap.of([
      ...findReplaceKeymap,
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      indentWithTab,
    ]),
  ];
}

/** Preference-driven extensions (theme, font, toggles, indent). */
export function buildPreferenceExtensions(prefs: EditorPreferences): Extension[] {
  const indent = prefs.indentWith === 'tabs' ? '\t' : ' '.repeat(Math.max(1, prefs.indentWidth));

  const extensions: Extension[] = [
    getThemeExtension(prefs.theme),
    EditorView.theme({
      '&': {
        fontSize: `${prefs.fontSize}px`,
      },
      '.cm-content': {
        fontFamily: resolveFontFamily(prefs.fontFamily),
        lineHeight: '1.7',
        paddingTop: '0.75rem',
        paddingBottom: '0.75rem',
      },
      '.cm-line': {
        lineHeight: '1.7',
      },
      '.cm-gutters': {
        fontFamily: resolveFontFamily(prefs.fontFamily),
      },
    }),
    indentUnit.of(indent),
    EditorState.tabSize.of(prefs.indentWidth),
  ];

  if (prefs.lineNumbers) {
    extensions.push(lineNumbers());
  }
  if (prefs.lineWrapping) {
    extensions.push(EditorView.lineWrapping);
  }
  if (prefs.codeFolding) {
    extensions.push(foldGutter());
  }
  if (prefs.matchBrackets) {
    extensions.push(bracketMatching(), closeBrackets());
  }
  if (prefs.autocomplete) {
    extensions.push(autocompletion());
  }
  if (prefs.keymap === 'vim') {
    extensions.push(vim());
  }

  return extensions;
}

export function buildEditorExtensions(
  prefs: EditorPreferences,
  extra: Extension[] = []
): Extension[] {
  return [...baseEditorExtensions(), ...buildPreferenceExtensions(prefs), ...extra];
}
