export type CodeLanguage = 'html' | 'css' | 'js';

//#region Format

/** Dispatch to the HTML / CSS / JS formatter; returns the original on error. */
export function formatCode(code: string, type: CodeLanguage): string {
  if (!code.trim()) return code;

  try {
    if (type === 'css') return formatCSS(code);
    if (type === 'js') return formatJS(code);
    if (type === 'html') return formatHTML(code);
  } catch (e) {
    console.error('Format error:', e);
  }
  return code;
}

const VOID_TAG_RE =
  /<(br|hr|img|input|link|meta|area|base|col|command|embed|keygen|param|source|track|wbr)/;

/** Indent HTML tags with two spaces. */
export function formatHTML(html: string): string {
  let formatted = '';
  let indent = 0;
  const tab = '  ';

  html.split(/(<[^>]+>)/g).forEach((part) => {
    if (part.trim() === '') return;

    if (part.startsWith('</')) {
      indent = Math.max(0, indent - 1);
      formatted += tab.repeat(indent) + part.trim() + '\n';
    } else if (part.startsWith('<') && !part.startsWith('<!') && !part.endsWith('/>')) {
      formatted += tab.repeat(indent) + part.trim() + '\n';
      if (!part.match(VOID_TAG_RE)) {
        indent++;
      }
    } else {
      formatted += tab.repeat(indent) + part.trim() + '\n';
    }
  });

  return formatted.trim();
}

/** Light CSS pretty-print (braces and semicolons). */
export function formatCSS(css: string): string {
  return css
    .replace(/\s*\{\s*/g, ' {\n  ')
    .replace(/\s*\}\s*/g, '\n}\n')
    .replace(/;\s*/g, ';\n  ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

/** Indent JS by brace depth (line-based). */
export function formatJS(js: string): string {
  let formatted = '';
  let indent = 0;
  const tab = '  ';

  js.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.endsWith('{')) {
      formatted += tab.repeat(indent) + trimmed + '\n';
      indent++;
    } else if (trimmed.startsWith('}')) {
      indent = Math.max(0, indent - 1);
      formatted += tab.repeat(indent) + trimmed + '\n';
    } else {
      formatted += tab.repeat(indent) + trimmed + '\n';
    }
  });

  return formatted.trim();
}

//#endregion Format

//#region Analyze

/** Run a cheap static check for one language; returns human-readable issues. */
export function analyzeCode(code: string, type: CodeLanguage): string[] {
  switch (type) {
    case 'html':
      return analyzeHTML(code);
    case 'css':
      return analyzeCSS(code);
    case 'js':
      return analyzeJS(code);
  }
}

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/** Flag tags whose open and close counts disagree. Void and self-closing tags are balanced. */
export function analyzeHTML(html: string): string[] {
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  const counts = new Map<string, number>();
  const tagRe = /<\/?([a-zA-Z][\w:-]*)\b[^>]*?\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(stripped))) {
    const raw = match[0];
    const name = match[1].toLowerCase();
    if (raw.startsWith('</')) {
      counts.set(name, (counts.get(name) ?? 0) - 1);
    } else if (raw.endsWith('/>') || VOID_TAGS.has(name)) {
      continue;
    } else {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  const issues: string[] = [];
  for (const [name, count] of counts) {
    if (count > 0) issues.push(`Unclosed <${name}> tag`);
    if (count < 0) issues.push(`Unexpected </${name}> tag`);
  }
  return issues;
}

/** Flag declarations inside `{ }` that have no `:`. */
export function analyzeCSS(css: string): string[] {
  const issues: string[] = [];
  const rules = css.match(/[^{}]+\{[^}]*\}/g) || [];
  rules.forEach((rule) => {
    const declarations = rule.match(/\{([^}]*)\}/)?.[1] || '';
    const lines = declarations.split(';').filter((l) => l.trim());
    lines.forEach((line) => {
      if (line.trim() && !line.includes(':')) {
        issues.push('Invalid CSS declaration: ' + line.trim());
      }
    });
  });
  return issues;
}

/** Flag mismatched `{ }` or `( )`. */
export function analyzeJS(js: string): string[] {
  const issues: string[] = [];

  const openBraces = (js.match(/\{/g) || []).length;
  const closeBraces = (js.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    issues.push('Mismatched braces detected');
  }

  const openParens = (js.match(/\(/g) || []).length;
  const closeParens = (js.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    issues.push('Mismatched parentheses detected');
  }

  return issues;
}

//#endregion Analyze
