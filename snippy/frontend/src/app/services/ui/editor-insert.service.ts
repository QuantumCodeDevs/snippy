import { Injectable } from '@angular/core';
import { EditorView } from '@codemirror/view';
export type EditorPane = 'html' | 'css' | 'js';

/**
 * Lets the assets dialog insert at the CodeMirror caret. Editors register
 * their views on init and unregister on destroy.
 */
@Injectable({ providedIn: 'root' })
export class EditorInsertService {
  private views = new Map<EditorPane, EditorView>();
  private lastFocused: EditorPane | null = null;

  //#region View registry

  /** Remember the live CodeMirror view for a pane. */
  register(pane: EditorPane, view: EditorView) {
    this.views.set(pane, view);
  }

  /** Drop the view if it is still the registered one for that pane. */
  unregister(pane: EditorPane, view: EditorView) {
    if (this.views.get(pane) === view) {
      this.views.delete(pane);
      if (this.lastFocused === pane) this.lastFocused = null;
    }
  }

  /** The live view for a pane, if mounted. */
  view(pane: EditorPane): EditorView | undefined {
    return this.views.get(pane);
  }

  /** Remember which pane the user last typed in, for pane-scoped shortcuts. */
  markFocused(pane: EditorPane) {
    this.lastFocused = pane;
  }

  /** The focused pane, else the last focused one, else HTML. */
  activePane(): EditorPane {
    for (const [pane, view] of this.views) {
      if (view.hasFocus) return pane;
    }
    return this.lastFocused ?? 'html';
  }

  /** Move keyboard focus into a pane; returns false if that pane is not mounted. */
  focus(pane: EditorPane): boolean {
    const view = this.views.get(pane);
    if (!view) return false;
    view.focus();
    this.lastFocused = pane;
    return true;
  }

  //#endregion View registry

  //#region Insert

  /** Insert `text` at the caret of the given pane; returns false if that pane is not mounted. */
  insertAtCursor(pane: EditorPane, text: string): boolean {
    const view = this.views.get(pane);
    if (!view) return false;
    const pos = view.state.selection.main.head;
    view.dispatch({
      changes: { from: pos, insert: text },
      selection: { anchor: pos + text.length },
      scrollIntoView: true,
    });
    view.focus();
    return true;
  }

  //#endregion Insert
}
