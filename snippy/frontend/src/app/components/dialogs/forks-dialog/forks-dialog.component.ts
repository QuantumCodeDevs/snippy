import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { RouterModule } from '@angular/router';
import { SnippyApi } from '@app/services/data/snippy-api.service';
import { SnippetList } from '@app/models/base-models/snippet-list';
import { SnackbarService } from '@app/services/ui/snackbar.service';
import { NavigationService } from '@app/services/ui/navigation.service';

export interface ForksDialogData {
  shortId: string;
  snippetName: string;
}

@Component({
  selector: 'app-forks-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    RouterModule,
  ],
  templateUrl: './forks-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class ForksDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<ForksDialogComponent>);
  data = inject<ForksDialogData>(MAT_DIALOG_DATA);
  private api = inject(SnippyApi);
  private snackbar = inject(SnackbarService);
  private navigation = inject(NavigationService);

  forks = signal<SnippetList[]>([]);
  totalCount = signal(0);
  loading = signal(false);

  ngOnInit(): void {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      const res = await this.api.getSnippetForks(this.data.shortId, 50);
      this.forks.set(res.snippets ?? []);
      this.totalCount.set(res.totalCount ?? 0);
    } catch {
      this.snackbar.error('Failed to load forks');
    } finally {
      this.loading.set(false);
    }
  }

  openFork(fork: SnippetList) {
    if (!fork.shortId) return;
    this.dialogRef.close();
    void this.navigation.toSnippet(fork.shortId, fork.userName);
  }
}
