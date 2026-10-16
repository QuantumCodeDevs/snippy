import {
  Component,
  computed,
  signal,
  inject,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
} from '@angular/core';

import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
import { EditorCommandsService } from '@app/services/ui/editor-commands.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule],
  templateUrl: './footer.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  snippetStoreService = inject(SnippetStoreService);
  editorUi = inject(EditorUiService);
  previewConsole = inject(PreviewConsoleService);
  editorCommands = inject(EditorCommandsService);
  private dialogService = inject(DialogService);
  private snippetActions = inject(SnippetActionsService);
  private snackbar = inject(SnackbarService);
  private zipImport = inject(ZipImportService);

  @ViewChild('zipInput') zipInput?: ElementRef<HTMLInputElement>;

  /** True while an imported ZIP is being unpacked. */
  readonly importing = signal(false);

  readonly githubUrl = 'https://github.com/QuantumCodeDevs/snippy';
  readonly licenseUrl = 'https://github.com/QuantumCodeDevs/snippy/blob/main/LICENSE';

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
    this.dialogService.open(EmbedDialogComponent, 'xl');
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

  triggerImportZip() {
    this.zipInput?.nativeElement.click();
  }

  async onZipSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.importing.set(true);
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
    } finally {
      this.importing.set(false);
    }
  }
}
