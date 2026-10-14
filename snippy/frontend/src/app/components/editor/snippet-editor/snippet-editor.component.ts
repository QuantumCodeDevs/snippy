import {
  Component,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  Input,
  OnInit,
  signal,
  effect,
  inject,
  ChangeDetectionStrategy,
  untracked,
} from '@angular/core';

import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EditorView } from 'codemirror';
import { Compartment, EditorState } from '@codemirror/state';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';
import { DialogService } from '@app/services/ui/dialog.service';
import { EditorPreferencesService } from '@app/editor/editor-preferences.service';
import { EditorInsertService } from '@app/services/ui/editor-insert.service';
import { baseEditorExtensions, buildPreferenceExtensions } from '@app/editor/codemirror-extensions';

@Component({
  selector: 'app-snippet-editor',
  imports: [MatMenuModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './snippet-editor.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './snippet-editor.component.scss',
})
export class SnippetEditorComponent implements OnInit, AfterViewInit, OnDestroy {
  // Input for editor type only
  @Input() editorType: 'html' | 'css' | 'js' = 'html';
  @ViewChild('editor', { static: false }) editorRef?: ElementRef<HTMLDivElement>;

  private snippetStoreService = inject(SnippetStoreService);
  private dialogService = inject(DialogService);
  private editorPrefs = inject(EditorPreferencesService);
  private editorInsert = inject(EditorInsertService);

  // CodeMirror editor instance
  private editorInstance?: EditorView;
  private prefsCompartment = new Compartment();

  // Code content signal
  private code = signal('');

  //#region Lifecycle

  constructor() {
    // Watch state service for changes to this editor's file type
    effect(() => {
      const snippet = this.snippetStoreService.snippet();
      if (snippet?.snippetFiles) {
        const file = snippet.snippetFiles.find((f) => f.fileType === this.editorType);
        if (file && file.content !== this.code()) {
          this.code.set(file.content ?? '');
          // Update editor content if it's already initialized
          if (this.editorInstance) {
            this.updateEditorContent(file.content ?? '');
          }
        }
      }
    });

    effect(() => {
      const prefs = this.editorPrefs.preferences();
      const view = untracked(() => this.editorInstance);
      if (!view) return;
      view.dispatch({
        effects: this.prefsCompartment.reconfigure(buildPreferenceExtensions(prefs)),
      });
    });
  }

  ngOnInit() {
    // Initialization handled by effect watching state service
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initializeEditor();
    }, 0);
  }

  ngOnDestroy() {
    if (this.editorInstance) {
      this.editorInsert.unregister(this.editorType, this.editorInstance);
      this.editorInstance.destroy();
    }
  }

  //#endregion Lifecycle

  //#region CodeMirror

  /** Replace the editor document without treating it as a user keystroke. */
  private updateEditorContent(content: string) {
    if (!this.editorInstance) return;
    this.editorInstance.dispatch({
      changes: { from: 0, to: this.editorInstance.state.doc.length, insert: content },
    });
  }

  /** Mount CodeMirror for this pane and register it with `EditorInsertService`. */
  private initializeEditor() {
    if (!this.editorRef) return;

    const prefs = this.editorPrefs.preferences();

    this.editorInstance = new EditorView({
      state: EditorState.create({
        doc: this.code(),
        extensions: [
          ...baseEditorExtensions(),
          this.prefsCompartment.of(buildPreferenceExtensions(prefs)),
          this.getLanguageExtension(),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const value = update.state.doc.toString();
              this.code.set(value);
              this.snippetStoreService.updateSnippetFile(this.editorType, value);
            }
          }),
        ],
      }),
      parent: this.editorRef.nativeElement,
    });
    this.editorInsert.register(this.editorType, this.editorInstance);
  }

  /** Language pack for html / css / js. */
  private getLanguageExtension() {
    switch (this.editorType) {
      case 'html':
        return html();
      case 'css':
        return css();
      case 'js':
        return javascript();
      default:
        return html();
    }
  }

  //#endregion CodeMirror

  //#region Code Formatting

  /** Pretty-print the current pane and write it back into CodeMirror. */
  formatCode() {
    if (!this.editorInstance) return;

    const formatted = this.basicFormat(this.code(), this.editorType);

    // Update the editor content
    this.editorInstance.dispatch({
      changes: { from: 0, to: this.editorInstance.state.doc.length, insert: formatted },
    });
  }

  /** Dispatch to HTML / CSS / JS formatters; returns original on error. */
  private basicFormat(code: string, type: 'html' | 'css' | 'js'): string {
    if (!code.trim()) return code;

    try {
      if (type === 'css') {
        return this.formatCSS(code);
      } else if (type === 'js') {
        return this.formatJS(code);
      } else if (type === 'html') {
        return this.formatHTML(code);
      }
    } catch (e) {
      console.error('Format error:', e);
    }
    return code;
  }

  /** Indent HTML tags with two spaces. */
  private formatHTML(html: string): string {
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
        if (
          !part.match(
            /<(br|hr|img|input|link|meta|area|base|col|command|embed|keygen|param|source|track|wbr)/
          )
        ) {
          indent++;
        }
      } else if (part.startsWith('<')) {
        formatted += tab.repeat(indent) + part.trim() + '\n';
      } else {
        formatted += tab.repeat(indent) + part.trim() + '\n';
      }
    });

    return formatted.trim();
  }

  /** Light CSS pretty-print (braces and semicolons). */
  private formatCSS(css: string): string {
    return css
      .replace(/\s*\{\s*/g, ' {\n  ')
      .replace(/\s*\}\s*/g, '\n}\n')
      .replace(/;\s*/g, ';\n  ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  /** Indent JS by brace depth (line-based). */
  private formatJS(js: string): string {
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

  //#endregion Code Formatting

  //#region Analyze code (check for issues)

  /** Run a cheap static check and show a success/warning dialog. */
  analyzeCode() {
    let issues: string[] = [];

    switch (this.editorType) {
      case 'html':
        issues = this.analyzeHTML(this.code());
        break;
      case 'css':
        issues = this.analyzeCSS(this.code());
        break;
      case 'js':
        issues = this.analyzeJS(this.code());
        break;
    }

    if (issues.length === 0) {
      this.dialogService.success('Analysis', `No issues found in ${this.editorType.toUpperCase()}`);
    } else {
      this.dialogService.warning(
        'Issues Found',
        `Issues found in ${this.editorType.toUpperCase()}:\n\n${issues.join('\n')}`
      );
    }
  }

  /** Flag when open/close tag counts disagree. */
  private analyzeHTML(html: string): string[] {
    const issues: string[] = [];

    // Check for unclosed tags
    const openTags = html.match(/<([a-z]+)[^>]*>/gi) || [];
    const closeTags = html.match(/<\/([a-z]+)>/gi) || [];

    if (openTags.length !== closeTags.length) {
      issues.push('Potential unclosed tags detected');
    }

    return issues;
  }

  /** Flag declarations inside `{ }` that have no `:`. */
  private analyzeCSS(css: string): string[] {
    const issues: string[] = [];

    // Check for missing semicolons
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
  private analyzeJS(js: string): string[] {
    const issues: string[] = [];

    // Basic syntax checks
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

  //#endregion Analyze code (check for issues)
}
