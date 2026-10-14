import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { Extension } from '@codemirror/state';
import { tags } from '@lezer/highlight';

/** Token colors matching One Dark's HighlightStyle tag groups. */
export interface SyntaxPalette {
  keyword: string;
  name: string;
  function: string;
  constant: string;
  definition: string;
  type: string;
  operator: string;
  comment: string;
  string: string;
  atom: string;
  invalid: string;
}

export function highlightSyntax(palette: SyntaxPalette): Extension {
  return syntaxHighlighting(
    HighlightStyle.define([
      { tag: tags.keyword, color: palette.keyword },
      {
        tag: [tags.name, tags.deleted, tags.character, tags.propertyName, tags.macroName],
        color: palette.name,
      },
      { tag: [tags.function(tags.variableName), tags.labelName], color: palette.function },
      {
        tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)],
        color: palette.constant,
      },
      { tag: [tags.definition(tags.name), tags.separator], color: palette.definition },
      {
        tag: [
          tags.typeName,
          tags.className,
          tags.number,
          tags.changed,
          tags.annotation,
          tags.modifier,
          tags.self,
          tags.namespace,
        ],
        color: palette.type,
      },
      {
        tag: [
          tags.operator,
          tags.operatorKeyword,
          tags.url,
          tags.escape,
          tags.regexp,
          tags.link,
          tags.special(tags.string),
        ],
        color: palette.operator,
      },
      { tag: [tags.meta, tags.comment], color: palette.comment },
      { tag: tags.strong, fontWeight: 'bold' },
      { tag: tags.emphasis, fontStyle: 'italic' },
      { tag: tags.strikethrough, textDecoration: 'line-through' },
      { tag: tags.link, color: palette.comment, textDecoration: 'underline' },
      { tag: tags.heading, fontWeight: 'bold', color: palette.name },
      { tag: [tags.atom, tags.bool, tags.special(tags.variableName)], color: palette.atom },
      { tag: [tags.processingInstruction, tags.string, tags.inserted], color: palette.string },
      { tag: tags.invalid, color: palette.invalid },
    ])
  );
}

export const SOLARIZED_DARK_SYNTAX: SyntaxPalette = {
  keyword: '#859900',
  name: '#268bd2',
  function: '#268bd2',
  constant: '#cb4b16',
  definition: '#839496',
  type: '#b58900',
  operator: '#6c71c4',
  comment: '#586e75',
  string: '#2aa198',
  atom: '#d33682',
  invalid: '#dc322f',
};

export const SOLARIZED_LIGHT_SYNTAX: SyntaxPalette = {
  ...SOLARIZED_DARK_SYNTAX,
  definition: '#657b83',
  comment: '#93a1a1',
};

export const DRACULA_SYNTAX: SyntaxPalette = {
  keyword: '#ff79c6',
  name: '#f8f8f2',
  function: '#50fa7b',
  constant: '#bd93f9',
  definition: '#f8f8f2',
  type: '#8be9fd',
  operator: '#ff79c6',
  comment: '#6272a4',
  string: '#f1fa8c',
  atom: '#bd93f9',
  invalid: '#ff5555',
};

export const GITHUB_DARK_SYNTAX: SyntaxPalette = {
  keyword: '#ff7b72',
  name: '#79c0ff',
  function: '#d2a8ff',
  constant: '#79c0ff',
  definition: '#e6edf3',
  type: '#ffa657',
  operator: '#ff7b72',
  comment: '#8b949e',
  string: '#a5d6ff',
  atom: '#79c0ff',
  invalid: '#ffa198',
};

export const MATERIAL_DARK_SYNTAX: SyntaxPalette = {
  keyword: '#c792ea',
  name: '#eeffff',
  function: '#82aaff',
  constant: '#f78c6c',
  definition: '#eeffff',
  type: '#ffcb6b',
  operator: '#89ddff',
  comment: '#546e7a',
  string: '#c3e88d',
  atom: '#f78c6c',
  invalid: '#ff5370',
};

export const LIGHT_SYNTAX: SyntaxPalette = {
  keyword: '#d73a49',
  name: '#005cc5',
  function: '#6f42c1',
  constant: '#005cc5',
  definition: '#24292e',
  type: '#e36209',
  operator: '#d73a49',
  comment: '#6a737d',
  string: '#032f62',
  atom: '#005cc5',
  invalid: '#b31d28',
};
