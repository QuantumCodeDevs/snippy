import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { SnippyApi } from '@app/services/data/snippy-api.service';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';
import { SnackbarService } from '@app/services/ui/snackbar.service';

@Component({
  selector: 'app-share-link-dialog',
  imports: [MatDialogModule, MatButtonModule, MatDividerModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h2 mat-dialog-title>Secret share link</h2>
    <mat-dialog-content>
      <p class="text-sm text-muted">
        Anyone with this link can open the pen, even if it is private. They cannot edit or save
        unless they fork it.
      </p>
      @if (url()) {
        <p class="mt-4 break-all rounded-md bg-raised px-3 py-2 text-sm">{{ url() }}</p>
      } @else {
        <p class="mt-4 text-sm text-faint">No share link yet.</p>
      }
    </mat-dialog-content>
    <mat-divider></mat-divider>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="dialogRef.close()">Close</button>
      @if (url()) {
        <button mat-button type="button" (click)="copy()">Copy</button>
        <button mat-button type="button" color="warn" [disabled]="busy()" (click)="revoke()">
          Revoke
        </button>
      } @else {
        <button mat-raised-button color="primary" [disabled]="busy()" (click)="create()">
          Create link
        </button>
      }
    </mat-dialog-actions>
  `,
})
export class ShareLinkDialogComponent {
  dialogRef = inject(MatDialogRef<ShareLinkDialogComponent>);
  private snippetStore = inject(SnippetStoreService);
  private api = inject(SnippyApi);
  private snackbar = inject(SnackbarService);

  busy = signal(false);
  url = signal<string | null>(this.urlFromToken(this.snippetStore.snippet()?.shareToken));

  async create() {
    const snippetId = this.snippetStore.snippet()?.snippetId;
    if (!snippetId) return;
    this.busy.set(true);
    try {
      const res = await this.api.createSnippetShareLink(snippetId);
      this.snippetStore.patchShareToken(res.shareToken ?? null);
      this.url.set(this.urlFromToken(res.shareToken));
      this.snackbar.success('Share link created');
    } catch {
      this.snackbar.error('Could not create share link');
    } finally {
      this.busy.set(false);
    }
  }

  async revoke() {
    const snippetId = this.snippetStore.snippet()?.snippetId;
    if (!snippetId) return;
    this.busy.set(true);
    try {
      await this.api.revokeSnippetShareLink(snippetId);
      this.snippetStore.patchShareToken(null);
      this.url.set(null);
      this.snackbar.success('Share link revoked');
    } catch {
      this.snackbar.error('Could not revoke share link');
    } finally {
      this.busy.set(false);
    }
  }

  async copy() {
    const value = this.url();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      this.snackbar.success('Copied');
    } catch {
      this.snackbar.error('Copy failed');
    }
  }

  private urlFromToken(token?: string | null): string | null {
    if (!token) return null;
    return `${window.location.origin}/s/${token}`;
  }
}
