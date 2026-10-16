import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
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
import { AssetsDialogComponent } from '@app/components/dialogs/assets-dialog/assets-dialog.component';
import { EmbedDialogComponent } from '@app/components/dialogs/embed-dialog/embed-dialog.component';
import { ShareLinkDialogComponent } from '@app/components/dialogs/share-link-dialog/share-link-dialog.component';
import { KeyboardShortcutsDialogComponent } from '@app/components/dialogs/keyboard-shortcuts-dialog/keyboard-shortcuts-dialog.component';
import { EditorCommandsService } from '@app/services/ui/editor-commands.service';
import { formatCombo, shortcutHint } from '@app/shortcuts/keyboard-shortcuts';

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
    <h2 mat-dialog-title id="command-palette-title">Command palette</h2>
    <mat-dialog-content>
      <input
        class="palette-input w-full rounded-md bg-transparent px-2 py-2 text-sm"
        type="search"
        placeholder="Search commands…"
        aria-labelledby="command-palette-title"
        aria-controls="command-palette-list"
        [attr.aria-activedescendant]="activeId()"
        [(ngModel)]="query"
        (ngModelChange)="filter()"
        (keydown)="onKeydown($event)"
        autofocus
      />
      <ul id="command-palette-list" class="mt-3 space-y-1" role="listbox" aria-label="Commands">
        @for (cmd of visible(); track cmd.id; let i = $index) {
          <li role="option" [id]="'cmd-' + cmd.id" [attr.aria-selected]="i === active()">
            <button
              type="button"
              tabindex="-1"
              class="palette-item flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-raised"
              [class.palette-item--active]="i === active()"
              (mouseenter)="active.set(i)"
              (click)="run(cmd)"
            >
              <mat-icon aria-hidden="true">{{ cmd.icon }}</mat-icon>
              <span class="flex-1">{{ cmd.label }}</span>
              @if (cmd.hint) {
                <kbd class="kbd">{{ cmd.hint }}</kbd>
              }
            </button>
          </li>
        } @empty {
          <li class="px-2 py-3 text-sm text-faint" role="presentation">No matching commands</li>
        }
      </ul>
    </mat-dialog-content>
  `,
  styles: `
    .palette-input {
      border: 1px solid var(--hairline);
    }
    .palette-input:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: 1px;
    }
    .palette-item--active {
      background: var(--surface-hover);
    }
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
  private editorCommands = inject(EditorCommandsService);

  query = '';
  visible = signal<PaletteCommand[]>([]);
  active = signal(0);
  activeId = computed(() => {
    const cmd = this.visible()[this.active()];
    return cmd ? `cmd-${cmd.id}` : null;
  });
  private all: PaletteCommand[] = [];

  constructor() {
    this.all = this.buildCommands();
    this.visible.set(this.all);
  }

  filter() {
    const q = this.query.trim().toLowerCase();
    this.visible.set(q ? this.all.filter((c) => c.label.toLowerCase().includes(q)) : this.all);
    this.active.set(0);
  }

  /** Arrow keys move the highlight; Enter runs it. */
  onKeydown(event: KeyboardEvent) {
    const count = this.visible().length;
    if (!count) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.active.update((i) => (i + 1) % count);
      this.scrollActiveIntoView();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.active.update((i) => (i - 1 + count) % count);
      this.scrollActiveIntoView();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const cmd = this.visible()[this.active()];
      if (cmd) this.run(cmd);
    }
  }

  private scrollActiveIntoView() {
    const id = this.activeId();
    if (!id) return;
    queueMicrotask(() => document.getElementById(id)?.scrollIntoView({ block: 'nearest' }));
  }

  /** Close first, then run, so dialog focus restoration cannot steal focus from the action. */
  run(cmd: PaletteCommand) {
    this.dialogRef.afterClosed().subscribe(() => cmd.run());
    this.dialogRef.close();
  }

  private buildCommands(): PaletteCommand[] {
    const snippet = this.snippetStore.snippet();
    const guest = this.editorUi.guestMode();
    const editorOpen = this.editorUi.editorOpen() && !!snippet;
    const commands: PaletteCommand[] = [
      {
        id: 'home',
        label: 'Go home',
        icon: 'home',
        run: () => void this.router.navigate([this.auth.isAuthenticated() ? '/home' : '/']),
      },
      {
        id: 'public',
        label: 'Browse public snippets',
        icon: 'travel_explore',
        run: () => void this.router.navigate(['/public']),
      },
      {
        id: 'new',
        label: 'New snippet',
        hint: shortcutHint('new-snippet'),
        icon: 'add',
        run: () =>
          this.auth.isAuthenticated()
            ? void this.navigation.toNewSnippet()
            : void this.router.navigate(['/try']),
      },
      {
        id: 'shortcuts',
        label: 'Keyboard shortcuts',
        hint: shortcutHint('shortcuts'),
        icon: 'keyboard',
        run: () =>
          this.dialogs.open(KeyboardShortcutsDialogComponent, 'lg', { id: 'keyboard-shortcuts' }),
      },
    ];

    if (this.auth.isAuthenticated()) {
      commands.push({
        id: 'settings',
        label: 'Open account settings',
        icon: 'manage_accounts',
        run: () => void this.router.navigate(['/settings']),
      });
    }

    if (editorOpen) {
      if (this.editorCommands.canSave()) {
        commands.unshift({
          id: 'save',
          label: 'Save snippet',
          hint: shortcutHint('save'),
          icon: 'save',
          run: () => void this.saveUi.saveSnippetWithUI(this.snippetStore, () => this.auth.user()),
        });
      }
      commands.push(
        {
          id: 'find-replace',
          label: 'Find & replace in current pane',
          hint: formatCombo({ key: 'h', mod: true }),
          icon: 'find_replace',
          run: () => void this.editorCommands.findReplace(undefined, true),
        },
        {
          id: 'format',
          label: 'Format current pane',
          hint: shortcutHint('format-pane'),
          icon: 'format_align_left',
          run: () => this.editorCommands.formatPane(),
        },
        {
          id: 'focus-html',
          label: 'Focus HTML pane',
          hint: shortcutHint('focus-html'),
          icon: 'html',
          run: () => this.editorCommands.focusPane('html'),
        },
        {
          id: 'focus-css',
          label: 'Focus CSS pane',
          hint: shortcutHint('focus-css'),
          icon: 'css',
          run: () => this.editorCommands.focusPane('css'),
        },
        {
          id: 'focus-js',
          label: 'Focus JS pane',
          hint: shortcutHint('focus-js'),
          icon: 'javascript',
          run: () => this.editorCommands.focusPane('js'),
        },
        {
          id: 'rerun',
          label: 'Re-run preview',
          hint: shortcutHint('rerun-preview'),
          icon: 'replay',
          run: () => this.editorCommands.rerunPreview(),
        },
        {
          id: 'console',
          label: 'Toggle console',
          hint: shortcutHint('toggle-console'),
          icon: 'terminal',
          run: () => this.editorCommands.toggleConsole(),
        },
        {
          id: 'export',
          label: 'Export as ZIP',
          hint: shortcutHint('export'),
          icon: 'download',
          run: () => void this.editorCommands.exportZip(),
        }
      );
      if (this.editorCommands.canEditSettings()) {
        commands.push({
          id: 'snippet-settings',
          label: guest ? 'CDN libraries' : 'Snippet settings',
          hint: shortcutHint('snippet-settings'),
          icon: 'tune',
          run: () => this.editorCommands.openSettings(),
        });
      }
      for (const layout of ['top', 'bottom', 'left', 'right'] as EditorLayout[]) {
        commands.push({
          id: `layout-${layout}`,
          label: `Editor layout: ${layout}`,
          icon: 'view_quilt',
          run: () => this.editorUi.setLayout(layout),
        });
      }
    }

    if (editorOpen && snippet && !guest) {
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
        if (snippet.isOwner) {
          commands.push({
            id: 'share',
            label: 'Share link',
            icon: 'share',
            run: () => this.dialogs.open(ShareLinkDialogComponent, 'md'),
          });
        }
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
