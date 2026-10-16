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
import { analyzeCode } from '@app/editor/code-format';
import { EditorCommandsService } from '@app/services/ui/editor-commands.service';

const PANE_LABELS: Record<'html' | 'css' | 'js', string> = {
  html: 'HTML',
  css: 'CSS',
  js: 'JavaScript',
};

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
  private editorCommands = inject(EditorCommandsService);

  get paneLabel() {
    return PANE_LABELS[this.editorType];
  }

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
          EditorView.contentAttributes.of({ 'aria-label': `${this.paneLabel} code editor` }),
          EditorView.updateListener.of((update) => {
            if (update.focusChanged && update.view.hasFocus) {
              this.editorInsert.markFocused(this.editorType);
            }
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

  //#region Pane actions

  /** Pretty-print this pane and write it back into CodeMirror. */
  formatCode() {
    this.editorCommands.formatPane(this.editorType);
  }

  /** Open CodeMirror's find/replace panel in this pane. */
  openFindReplace() {
    void this.editorCommands.findReplace(this.editorType);
  }

  /** Run a cheap static check and show a success/warning dialog. */
  analyzeCode() {
    const issues = analyzeCode(this.code(), this.editorType);
    const label = this.editorType.toUpperCase();
    if (issues.length === 0) {
      this.dialogService.success('Analysis', `No issues found in ${label}`);
    } else {
      this.dialogService.warning(
        'Issues Found',
        `Issues found in ${label}:\n\n${issues.join('\n')}`
      );
    }
  }

  //#endregion Pane actions
}
