import {
  analyzeCSS,
  analyzeCode,
  analyzeHTML,
  analyzeJS,
  formatCSS,
  formatCode,
  formatHTML,
  formatJS,
} from '@app/editor/code-format';

describe('code-format', () => {
  describe('formatCode', () => {
    it('returns blank input unchanged', () => {
      expect(formatCode('   ', 'html')).toBe('   ');
    });

    it('dispatches by language', () => {
      expect(formatCode('a{color:red}', 'css')).toBe(formatCSS('a{color:red}'));
      expect(formatCode('if (x) {\ny()\n}', 'js')).toBe(formatJS('if (x) {\ny()\n}'));
      expect(formatCode('<div><p>x</p></div>', 'html')).toBe(formatHTML('<div><p>x</p></div>'));
    });
  });

  describe('formatHTML', () => {
    it('indents nested tags by two spaces', () => {
      expect(formatHTML('<div><p>Hi</p></div>')).toBe('<div>\n  <p>\n    Hi\n  </p>\n</div>');
    });

    it('does not indent after void or self-closing tags', () => {
      expect(formatHTML('<div><br><img src="a.png"/><span>x</span></div>')).toBe(
        '<div>\n  <br>\n  <img src="a.png"/>\n  <span>\n    x\n  </span>\n</div>'
      );
    });
  });

  describe('formatCSS', () => {
    it('puts each declaration on its own line', () => {
      expect(formatCSS('a{color:red;margin:0}')).toBe('a {\n  color:red;\n  margin:0\n}');
    });
  });

  describe('formatJS', () => {
    it('indents by brace depth', () => {
      expect(formatJS('function f() {\nreturn 1;\n}')).toBe('function f() {\n  return 1;\n}');
    });

    it('never indents below zero on stray closing braces', () => {
      expect(formatJS('}\nx();')).toBe('}\nx();');
    });
  });

  describe('analyzeHTML', () => {
    it('does not flag void or self-closing tags as unclosed', () => {
      expect(analyzeHTML('<div><img src="a.png"><br><input></div>')).toEqual([]);
      expect(analyzeHTML('<div class="card" />')).toEqual([]);
      expect(analyzeHTML('<!-- <div> --><p>ok</p>')).toEqual([]);
    });

    it('ignores markup inside script and style blocks', () => {
      expect(analyzeHTML('<script>const s = "<div>";</script><p>ok</p>')).toEqual([]);
    });

    it('flags missing and unexpected closing tags', () => {
      expect(analyzeHTML('<div><span>hi</div>')).toEqual(['Unclosed <span> tag']);
      expect(analyzeHTML('</p>')).toEqual(['Unexpected </p> tag']);
    });
  });

  describe('analyzeCSS', () => {
    it('flags declarations without a colon', () => {
      expect(analyzeCSS('a { color: red; nonsense }')).toEqual([
        'Invalid CSS declaration: nonsense',
      ]);
      expect(analyzeCSS('a { color: red; }')).toEqual([]);
    });
  });

  describe('analyzeJS', () => {
    it('flags unbalanced braces and parentheses', () => {
      expect(analyzeJS('function f() {')).toEqual(['Mismatched braces detected']);
      expect(analyzeJS('f(1;')).toEqual(['Mismatched parentheses detected']);
      expect(analyzeJS('f(() => { return 1; });')).toEqual([]);
    });
  });

  it('analyzeCode routes by language', () => {
    expect(analyzeCode('<b>', 'html')).toEqual(['Unclosed <b> tag']);
    expect(analyzeCode('{', 'js')).toEqual(['Mismatched braces detected']);
    expect(analyzeCode('a { b }', 'css')).toEqual(['Invalid CSS declaration: b']);
  });
});
