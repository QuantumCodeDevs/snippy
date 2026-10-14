import { Injectable, signal } from '@angular/core';

export type EditorLayout = 'top' | 'bottom' | 'left' | 'right';

@Injectable({ providedIn: 'root' })
export class EditorUiService {
  readonly layout = signal<EditorLayout>(this.readStoredLayout());
  /** True on the public /try guest playground (no auth / no save). */
  readonly guestMode = signal(false);

  //#region Layout

  /** Persist pane layout (`top` / `bottom` / `left` / `right`). */
  setLayout(layout: EditorLayout) {
    this.layout.set(layout);
    localStorage.setItem('editorLayout', layout);
  }

  /** Read the last saved layout, defaulting to `top`. */
  private readStoredLayout(): EditorLayout {
    const saved = localStorage.getItem('editorLayout') as EditorLayout | null;
    if (saved === 'top' || saved === 'bottom' || saved === 'left' || saved === 'right') {
      return saved;
    }
    return 'top';
  }

  //#endregion Layout

  //#region Guest mode

  /** Mark the editor as the unauthenticated `/try` playground. */
  setGuestMode(guest: boolean) {
    this.guestMode.set(guest);
  }

  //#endregion Guest mode
}
