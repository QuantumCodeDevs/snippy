import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SnippetSettingsDialogComponent } from '@app/components/dialogs/snippet-settings-dialog/snippet-settings-dialog.component';
import { formatCode } from '@app/editor/code-format';
import type { Snippet } from '@app/models/base-models/snippet';
import { AuthStoreService } from '@app/services/stores/auth.store.service';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';
import { DialogService } from '@app/services/ui/dialog.service';
import { EditorInsertService, EditorPane } from '@app/services/ui/editor-insert.service';
import { EditorUiService } from '@app/services/ui/editor-ui.service';
import { PreviewConsoleService } from '@app/services/ui/preview-console.service';
import { SnackbarService } from '@app/services/ui/snackbar.service';
import { SnippetSaveUIService } from '@app/services/ui/snippet-save-ui.service';

/**
 * Editor actions shared by the header, footer, command palette, and keyboard
 * shortcuts, so each surface runs the same code path.
 */
@Injectable({ providedIn: 'root' })
export class EditorCommandsService {
  private snippetStore = inject(SnippetStoreService);
  private saveUi = inject(SnippetSaveUIService);
  private auth = inject(AuthStoreService);
  private editorUi = inject(EditorUiService);
  private dialogs = inject(DialogService);
  private editors = inject(EditorInsertService);
  private previewConsole = inject(PreviewConsoleService);
  private snackbar = inject(SnackbarService);
  private destroyRef = inject(DestroyRef);

  /** True while a ZIP export is being generated. */
  readonly exporting = signal(false);

  //#region Availability

  /** An editor route has a snippet open. */
  hasSnippet(): boolean {
    return !!this.snippetStore.snippet();
  }

  /** Signed-in owner (or unsaved new pen), not a guest or share viewer. */
  canSave(): boolean {
    const s = this.snippetStore.snippet();
    return !!s && !this.editorUi.guestMode() && (!!s.isOwner || !s.snippetId);
  }

  /** Owner or guest can edit settings (guests only see CDN tabs). */
  canEditSettings(): boolean {
    const s = this.snippetStore.snippet();
    return !!s && (!!s.isOwner || !s.snippetId);
  }

  //#endregion Availability

  //#region Snippet

  /** Save via the shared save flow (dirty check, snackbar, redirect for new pens). */
  save() {
    if (!this.canSave()) return Promise.resolve();
    return this.saveUi.saveSnippetWithUI(this.snippetStore, this.auth.user);
  }

  /** Open snippet settings; saves on close unless in guest mode. */
  openSettings() {
    const snippet = this.snippetStore.snippet();
    if (!snippet || !this.canEditSettings()) return;

    const guest = this.editorUi.guestMode();
    const dialogRef = this.dialogs.open(SnippetSettingsDialogComponent, 'xl', {
      data: { ...snippet, guestMode: guest },
      minHeight: '50vh',
      panelClass: 'snippy-dialog-tall',
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) return;
        this.snippetStore.updateSnippetSettings(result);
        if (!guest) {
          void this.saveUi.saveSnippetWithUI(this.snippetStore, this.auth.user);
        }
      });
  }

  /** Download HTML/CSS/JS (plus CDN links) as a ZIP. */
  async exportZip() {
    const snippet = this.snippetStore.snippet();
    if (!snippet || this.exporting()) return;
    this.exporting.set(true);
    try {
      const blob = await buildSnippetZip(snippet);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeFileName(snippet.name)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      this.snackbar.success('Exported ZIP');
    } catch {
      this.snackbar.error('Failed to export ZIP');
    } finally {
      this.exporting.set(false);
    }
  }

  //#endregion Snippet

  //#region Panes

  /** Pretty-print a pane (defaults to the focused one). */
  formatPane(pane: EditorPane = this.editors.activePane()) {
    const view = this.editors.view(pane);
    if (!view) return;
    const current = view.state.doc.toString();
    const formatted = formatCode(current, pane);
    if (formatted === current) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: formatted } });
  }

  /**
   * Open CodeMirror find/replace in a pane (defaults to the focused one).
   * Loaded lazily: this service is in the initial bundle (shortcuts, palette),
   * CodeMirror is not. A mounted pane means the editor chunk is already loaded.
   */
  async findReplace(pane: EditorPane = this.editors.activePane(), focusReplace = false) {
    const view = this.editors.view(pane);
    if (!view) return;
    const { openFindReplace } = await import('@app/editor/codemirror-extensions');
    openFindReplace(view, focusReplace);
  }

  /** Move keyboard focus into a pane. On a phone, also select that tab. */
  focusPane(pane: EditorPane) {
    if (this.editorUi.isCompact()) {
      this.editorUi.requestFocus(pane);
      return;
    }
    this.editors.focus(pane);
  }

  /** Toggle the JavaScript console panel. */
  toggleConsole() {
    this.previewConsole.toggle();
  }

  /** Re-run the preview from scratch. */
  rerunPreview() {
    if (!this.hasSnippet()) return;
    this.snippetStore.previewUpdateType.set(null);
    this.snippetStore.previewUpdateType.set('full');
  }

  //#endregion Panes
}

/** File-name-safe version of a snippet title. */
export function safeFileName(name: string | null | undefined): string {
  return (name || 'snippet').replace(/[^\w.\-]+/g, '_');
}

/** Build the CodePen-style export ZIP for a snippet. */
export async function buildSnippetZip(snippet: Snippet): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const files = snippet.snippetFiles ?? [];
  const html = files.find((f) => f.fileType === 'html')?.content ?? '';
  const css = files.find((f) => f.fileType === 'css')?.content ?? '';
  const js = files.find((f) => f.fileType === 'js')?.content ?? '';
  const cdnResources = snippet.cdnResources ?? [];

  const stylesheets = cdnResources
    .filter((res) => res.resourceType === 'css')
    .map((res) => `<link rel="stylesheet" href="${res.url}">`)
    .join('\n  ');

  const scripts = cdnResources
    .filter((res) => res.resourceType === 'js')
    .map((res) => `<script src="${res.url}"><\/script>`)
    .join('\n  ');

  const title = (snippet.name || 'snippet')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${stylesheets ? stylesheets + '\n  ' : ''}<link rel="stylesheet" href="style.css">
</head>
<body>
${html}
  <script src="script.js"><\/script>${scripts ? '\n  ' + scripts : ''}
</body>
</html>
`;

  zip.file('index.html', indexHtml);
  zip.file('style.css', css);
  zip.file('script.js', js);
  zip.file('README.txt', `Snippy export: ${snippet.name}\n${snippet.description || ''}\n`);

  return zip.generateAsync({ type: 'blob' });
}
