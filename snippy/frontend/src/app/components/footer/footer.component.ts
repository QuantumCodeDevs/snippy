import {
  Component,
  computed,
  inject,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
} from '@angular/core';

import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import JSZip from 'jszip';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';
import {
  AssetsDialogComponent,
  AssetsDialogData,
} from '@app/components/dialogs/assets-dialog/assets-dialog.component';
import { EmbedDialogComponent } from '@app/components/dialogs/embed-dialog/embed-dialog.component';
import { ShareLinkDialogComponent } from '@app/components/dialogs/share-link-dialog/share-link-dialog.component';
import { SnackbarService } from '@app/services/ui/snackbar.service';
import { DialogService } from '@app/services/ui/dialog.service';
import { SnippetActionsService } from '@app/services/ui/snippet-actions.service';
import { EditorUiService } from '@app/services/ui/editor-ui.service';
import { PreviewConsoleService } from '@app/services/ui/preview-console.service';
import { ZipImportService } from '@app/services/ui/zip-import.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './footer.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  snippetStoreService = inject(SnippetStoreService);
  editorUi = inject(EditorUiService);
  previewConsole = inject(PreviewConsoleService);
  private dialogService = inject(DialogService);
  private snippetActions = inject(SnippetActionsService);
  private snackbar = inject(SnackbarService);
  private zipImport = inject(ZipImportService);

  @ViewChild('zipInput') zipInput?: ElementRef<HTMLInputElement>;

  readonly githubUrl = 'https://github.com/slurrps-mcgee/Snippy';
  readonly licenseUrl = 'https://github.com/slurrps-mcgee/Snippy/blob/main/LICENSE';

  readonly showEditorActions = computed(
    () => this.editorUi.guestMode() || !!this.snippetStoreService.snippet()
  );

  readonly isGuest = computed(() => this.editorUi.guestMode());

  readonly hasSavedSnippet = computed(() => !!this.snippetStoreService.snippet()?.snippetId);

  readonly isOwner = computed(() => !!this.snippetStoreService.snippet()?.isOwner);

  openAssets() {
    this.dialogService.open<AssetsDialogComponent, AssetsDialogData>(AssetsDialogComponent, 'lg', {
      data: { insertTarget: 'html' },
    });
  }

  openEmbed() {
    this.dialogService.open(EmbedDialogComponent, 'lg');
  }

  openShare() {
    this.dialogService.open(ShareLinkDialogComponent, 'md');
  }

  toggleConsole() {
    this.previewConsole.toggle();
  }

  forkSnippet() {
    const snippet = this.snippetStoreService.snippet();
    if (!snippet?.snippetId) return;
    void this.snippetActions.forkAndOpen(snippet.snippetId);
  }

  async exportZip() {
    const snippet = this.snippetStoreService.snippet();
    if (!snippet) return;

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

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (snippet.name || 'snippet').replace(/[^\w.\-]+/g, '_');
    a.href = url;
    a.download = `${safeName}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    this.snackbar.success('Exported ZIP');
  }

  triggerImportZip() {
    this.zipInput?.nativeElement.click();
  }

  async onZipSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const imported = await this.zipImport.importFile(file);
      const snippet = this.snippetStoreService.snippet();
      if (!snippet) return;
      this.snippetStoreService.applyDraft({
        ...snippet,
        name: snippet.name || imported.name,
        snippetFiles: this.zipImport.filesFromImport(imported),
        cdnResources: imported.cdnResources,
      });
      this.snackbar.success('Imported ZIP');
    } catch {
      this.snackbar.error('Failed to import ZIP');
    }
  }
}
