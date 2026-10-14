import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { NavigationService } from '@app/services/ui/navigation.service';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';
import { SnippetSaveUIService } from '@app/services/ui/snippet-save-ui.service';
import { EditorUiService, EditorLayout } from '@app/services/ui/editor-ui.service';
import { DialogService } from '@app/services/ui/dialog.service';
import { SnippetActionsService } from '@app/services/ui/snippet-actions.service';
import { AuthStoreService } from '@app/services/stores/auth.store.service';
import { SnippetSettingsDialogComponent } from '@app/components/dialogs/snippet-settings-dialog/snippet-settings-dialog.component';
import { AssetsDialogComponent } from '@app/components/dialogs/assets-dialog/assets-dialog.component';
import { EmbedDialogComponent } from '@app/components/dialogs/embed-dialog/embed-dialog.component';
import { ShareLinkDialogComponent } from '@app/components/dialogs/share-link-dialog/share-link-dialog.component';

interface PaletteCommand {
  id: string;
  label: string;
  hint?: string;
  icon: string;
  run: () => void;
}

@Component({
  selector: 'app-command-palette',
  imports: [FormsModule, MatDialogModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h2 mat-dialog-title>Command palette</h2>
    <mat-dialog-content>
      <input
        class="w-full rounded-md bg-transparent px-2 py-2 text-sm outline-none"
        type="search"
        placeholder="Search commands…"
        [(ngModel)]="query"
        (ngModelChange)="filter()"
        autofocus
      />
      <ul class="mt-3 space-y-1">
        @for (cmd of visible(); track cmd.id) {
          <li>
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-raised"
              (click)="run(cmd)"
            >
              <mat-icon>{{ cmd.icon }}</mat-icon>
              <span class="flex-1">{{ cmd.label }}</span>
              @if (cmd.hint) {
                <span class="text-xs text-faint">{{ cmd.hint }}</span>
              }
            </button>
          </li>
        }
      </ul>
    </mat-dialog-content>
  `,
})
export class CommandPaletteComponent {
  private dialogRef = inject(MatDialogRef<CommandPaletteComponent>);
  private router = inject(Router);
  private navigation = inject(NavigationService);
  private snippetStore = inject(SnippetStoreService);
  private saveUi = inject(SnippetSaveUIService);
  private editorUi = inject(EditorUiService);
  private dialogs = inject(DialogService);
  private actions = inject(SnippetActionsService);
  private auth = inject(AuthStoreService);

  query = '';
  visible = signal<PaletteCommand[]>([]);
  private all: PaletteCommand[] = [];

  constructor() {
    this.all = this.buildCommands();
    this.visible.set(this.all);
  }

  filter() {
    const q = this.query.trim().toLowerCase();
    this.visible.set(q ? this.all.filter((c) => c.label.toLowerCase().includes(q)) : this.all);
  }

  run(cmd: PaletteCommand) {
    this.dialogRef.close();
    cmd.run();
  }

  private buildCommands(): PaletteCommand[] {
    const snippet = this.snippetStore.snippet();
    const guest = this.editorUi.guestMode();
    const commands: PaletteCommand[] = [
      {
        id: 'home',
        label: 'Go home',
        icon: 'home',
        run: () => void this.router.navigate(['/home']),
      },
      {
        id: 'settings',
        label: 'Open account settings',
        icon: 'manage_accounts',
        run: () => void this.router.navigate(['/settings']),
      },
      {
        id: 'new',
        label: 'New snippet',
        icon: 'add',
        run: () => void this.navigation.toNewSnippet(),
      },
    ];

    if (snippet && !guest) {
      commands.unshift({
        id: 'save',
        label: 'Save snippet',
        hint: 'Ctrl+S',
        icon: 'save',
        run: () => void this.saveUi.saveSnippetWithUI(this.snippetStore, () => this.auth.user()),
      });
      commands.push({
        id: 'snippet-settings',
        label: 'Snippet settings',
        icon: 'tune',
        run: () => this.dialogs.open(SnippetSettingsDialogComponent, 'xl'),
      });
      for (const layout of ['top', 'bottom', 'left', 'right'] as EditorLayout[]) {
        commands.push({
          id: `layout-${layout}`,
          label: `Editor layout: ${layout}`,
          icon: 'view_quilt',
          run: () => this.editorUi.setLayout(layout),
        });
      }
      if (snippet.snippetId) {
        commands.push({
          id: 'fork',
          label: 'Fork snippet',
          icon: 'fork_right',
          run: () => void this.actions.forkAndOpen(snippet.snippetId!),
        });
        commands.push({
          id: 'embed',
          label: 'Embed snippet',
          icon: 'code',
          run: () => this.dialogs.open(EmbedDialogComponent, 'xl'),
        });
        commands.push({
          id: 'share',
          label: 'Share link',
          icon: 'share',
          run: () => this.dialogs.open(ShareLinkDialogComponent, 'md'),
        });
      }
      commands.push({
        id: 'assets',
        label: 'Assets',
        icon: 'perm_media',
        run: () =>
          this.dialogs.open(AssetsDialogComponent, 'lg', {
            data: this.snippetStore.snippet() ? { insertTarget: 'html' } : {},
          }),
      });
    }

    return commands;
  }
}
