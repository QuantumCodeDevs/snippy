import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';

import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { SnippyApi } from '@app/services/data/snippy-api.service';
import { SnackbarService } from '@app/services/ui/snackbar.service';
import { DialogService } from '@app/services/ui/dialog.service';
import { Asset } from '@app/models/base-models/asset';
import { EditorInsertService, EditorPane } from '@app/services/ui/editor-insert.service';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';

export interface AssetsDialogData {
  insertTarget?: EditorPane | null;
}

@Component({
  selector: 'app-assets-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  templateUrl: './assets-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class AssetsDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<AssetsDialogComponent>);
  private data = inject<AssetsDialogData | null>(MAT_DIALOG_DATA, { optional: true });

  private api = inject(SnippyApi);
  private snackbarService = inject(SnackbarService);
  private dialogService = inject(DialogService);
  private editorInsert = inject(EditorInsertService);
  private snippetStore = inject(SnippetStoreService);

  readonly canInsert = !!this.data?.insertTarget;

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  assets = signal<Asset[]>([]);
  loading = signal(false);
  uploading = signal(false);
  deletingId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadAssets();
  }

  async loadAssets() {
    this.loading.set(true);
    try {
      const res = await this.api.listAssets();
      this.assets.set(res.assets ?? []);
    } catch {
      this.snackbarService.error('Failed to load assets');
    } finally {
      this.loading.set(false);
    }
  }

  triggerUpload() {
    this.fileInput?.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading.set(true);
    try {
      const res = await this.api.uploadAsset(file);
      if (res.asset) {
        this.assets.update((list) => [
          res.asset!,
          ...list.filter((a) => a.assetId !== res.asset!.assetId),
        ]);
      }
      this.snackbarService.success('File uploaded successfully');
    } catch {
      this.snackbarService.error('Failed to upload file');
    } finally {
      this.uploading.set(false);
      input.value = '';
    }
  }

  deleteAsset(asset: Asset) {
    const used = asset.usedInCount ?? 0;
    const usageNote =
      used > 0 ? ` It is referenced in ${used} snippet file${used === 1 ? '' : 's'}.` : '';
    return this.dialogService.confirmAndRun({
      confirm: {
        title: 'Delete Asset',
        message: `Are you sure you want to delete "${asset.fileName}"?${usageNote} This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
      action: async () => {
        this.deletingId.set(asset.assetId ?? null);
        try {
          if (!asset.assetId) throw new Error('Missing asset id');
          await this.api.deleteAsset(asset.assetId);
          this.assets.update((list) => list.filter((a) => a.assetId !== asset.assetId));
        } finally {
          this.deletingId.set(null);
        }
      },
      success: 'Asset deleted',
      error: 'Failed to delete asset',
    });
  }

  async copyUrl(asset: Asset) {
    if (!asset.url) return;
    const fullUrl = this.toAbsoluteUrl(asset.url);
    try {
      await navigator.clipboard.writeText(fullUrl);
      this.snackbarService.success('URL copied to clipboard');
    } catch {
      this.snackbarService.error('Failed to copy URL');
    }
  }

  insertIntoEditor(asset: Asset) {
    const pane = this.data?.insertTarget;
    if (!pane || !asset.url) return;
    const snippet = this.escapeAttr(asset.fileName || 'asset');
    const url = asset.url;
    let text = '';
    if (pane === 'html') {
      text = `<img src="${url}" alt="${snippet}">`;
    } else if (pane === 'css') {
      text = `url("${url}")`;
    } else {
      text = `"${url}"`;
    }
    const inserted = this.editorInsert.insertAtCursor(pane, text);
    if (!inserted) {
      const files = this.snippetStore.snippet()?.snippetFiles ?? [];
      const file = files.find((f) => f.fileType === pane);
      const next = `${file?.content ?? ''}${file?.content ? '\n' : ''}${text}`;
      this.snippetStore.updateSnippetFile(pane, next);
    }
    this.snackbarService.success(`Inserted into ${pane.toUpperCase()}`);
    this.dialogRef.close(true);
  }

  usageLabel(asset: Asset): string {
    const n = asset.usedInCount ?? 0;
    if (n === 0) return 'Unused';
    return `Used in ${n} file${n === 1 ? '' : 's'}`;
  }

  private escapeAttr(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  isImage(asset: Asset): boolean {
    return !!asset.fileType?.startsWith('image/');
  }

  toAbsoluteUrl(url: string): string {
    if (/^https?:\/\//i.test(url)) return url;
    return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  close() {
    this.dialogRef.close();
  }
}
