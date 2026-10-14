import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  ChangeDetectionStrategy,
  effect,
  inject,
  untracked,
} from '@angular/core';

import { EditorView } from 'codemirror';
import { Compartment, EditorState } from '@codemirror/state';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { EditorPreferencesService } from '@app/editor/editor-preferences.service';
import { baseEditorExtensions, buildPreferenceExtensions } from '@app/editor/codemirror-extensions';
import { EditorPreferences } from '@app/editor/editor-preferences';

@Component({
  selector: 'app-embed-code-pane',
  imports: [],
  template: `<div class="embed-code-pane" #host></div>`,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        min-height: 0;
      }
      .embed-code-pane {
        height: 100%;
        overflow: auto;
      }
      :host ::ng-deep .cm-editor {
        height: 100%;
      }
      :host ::ng-deep .cm-scroller {
        min-height: 100%;
      }
    `,
  ],
})
export class EmbedCodePaneComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() language: 'html' | 'css' | 'js' = 'html';
  @Input() content = '';
  @Input() editable = false;
  /** Optional URL theme override (e.g. from ?theme=). */
  @Input() theme: string | null = null;
  @Output() contentChange = new EventEmitter<string>();

  @ViewChild('host') hostRef?: ElementRef<HTMLDivElement>;

  private editorPrefs = inject(EditorPreferencesService);
  private view?: EditorView;
  private readOnlyCompartment = new Compartment();
  private prefsCompartment = new Compartment();
  private suppressEmit = false;

  constructor() {
    effect(() => {
      const prefs = this.effectivePrefs(this.editorPrefs.preferences());
      const view = untracked(() => this.view);
      if (!view) return;
      view.dispatch({
        effects: this.prefsCompartment.reconfigure(buildPreferenceExtensions(prefs)),
      });
    });
  }

  ngAfterViewInit() {
    this.createEditor();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.view) return;

    if (changes['editable'] && !changes['editable'].firstChange) {
      this.view.dispatch({
        effects: this.readOnlyCompartment.reconfigure(EditorState.readOnly.of(!this.editable)),
      });
    }

    if (changes['theme'] && !changes['theme'].firstChange) {
      this.view.dispatch({
        effects: this.prefsCompartment.reconfigure(
          buildPreferenceExtensions(this.effectivePrefs(this.editorPrefs.preferences()))
        ),
      });
    }

    if (changes['content'] && !changes['content'].firstChange) {
      const next = this.content ?? '';
      if (next !== this.view.state.doc.toString()) {
        this.suppressEmit = true;
        this.view.dispatch({
          changes: { from: 0, to: this.view.state.doc.length, insert: next },
        });
        this.suppressEmit = false;
      }
    }

    if (changes['language'] && !changes['language'].firstChange) {
      this.view.destroy();
      this.createEditor();
    }
  }

  ngOnDestroy() {
    this.view?.destroy();
  }

  private effectivePrefs(prefs: EditorPreferences): EditorPreferences {
    if (!this.theme) return prefs;
    return { ...prefs, theme: this.theme as EditorPreferences['theme'] };
  }

  private createEditor() {
    if (!this.hostRef) return;
    this.hostRef.nativeElement.innerHTML = '';

    const prefs = this.effectivePrefs(this.editorPrefs.preferences());

    this.view = new EditorView({
      state: EditorState.create({
        doc: this.content ?? '',
        extensions: [
          ...baseEditorExtensions(),
          this.prefsCompartment.of(buildPreferenceExtensions(prefs)),
          this.languageExtension(),
          this.readOnlyCompartment.of(EditorState.readOnly.of(!this.editable)),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged || this.suppressEmit || !this.editable) return;
            this.contentChange.emit(update.state.doc.toString());
          }),
        ],
      }),
      parent: this.hostRef.nativeElement,
    });
  }

  private languageExtension() {
    switch (this.language) {
      case 'css':
        return css();
      case 'js':
        return javascript();
      default:
        return html();
    }
  }
}
