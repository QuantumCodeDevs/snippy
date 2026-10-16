import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CommandPaletteComponent } from '@app/components/dialogs/command-palette/command-palette.component';
import { KeyboardShortcutsDialogComponent } from '@app/components/dialogs/keyboard-shortcuts-dialog/keyboard-shortcuts-dialog.component';
import { ShortcutId, findShortcut, isTypingTarget } from '@app/shortcuts/keyboard-shortcuts';
import { AuthStoreService } from '@app/services/stores/auth.store.service';
import { DialogService } from '@app/services/ui/dialog.service';
import { EditorCommandsService } from '@app/services/ui/editor-commands.service';
import { EditorUiService } from '@app/services/ui/editor-ui.service';
import { NavigationService } from '@app/services/ui/navigation.service';

/** Shortcuts that only make sense with the snippet editor open. */
const EDITOR_ONLY = new Set<ShortcutId>([
  'save',
  'export',
  'snippet-settings',
  'toggle-console',
  'rerun-preview',
  'format-pane',
  'focus-html',
  'focus-css',
  'focus-js',
]);

/** Routes window keydown events to app actions using the shortcut registry. */
@Injectable({ providedIn: 'root' })
export class KeyboardShortcutsService {
  private dialogs = inject(DialogService);
  private matDialog = inject(MatDialog);
  private router = inject(Router);
  private auth = inject(AuthStoreService);
  private navigation = inject(NavigationService);
  private editorUi = inject(EditorUiService);
  private commands = inject(EditorCommandsService);

  /** Handle one keydown; returns true when a shortcut ran (and default was prevented). */
  handle(event: KeyboardEvent): boolean {
    if (event.defaultPrevented || event.repeat || event.isComposing) return false;
    const shortcut = findShortcut(event);
    if (!shortcut) return false;
    if (!shortcut.allowInFields && isTypingTarget(event.target)) return false;

    const dialogOpen = this.matDialog.openDialogs.length > 0;
    if (dialogOpen && shortcut.id !== 'command-palette') return false;
    if (EDITOR_ONLY.has(shortcut.id) && !this.editorActive()) return false;

    event.preventDefault();
    this.run(shortcut.id);
    return true;
  }

  /** Run a shortcut's action directly (also used by the command palette). */
  run(id: ShortcutId) {
    switch (id) {
      case 'command-palette':
        if (!this.matDialog.getDialogById('command-palette')) {
          this.dialogs.open(CommandPaletteComponent, 'md', { id: 'command-palette' });
        }
        return;
      case 'shortcuts':
        this.openShortcuts();
        return;
      case 'new-snippet':
        if (this.auth.isAuthenticated()) {
          void this.navigation.toNewSnippet();
        } else {
          void this.router.navigate(['/try']);
        }
        return;
      case 'save':
        void this.commands.save();
        return;
      case 'export':
        void this.commands.exportZip();
        return;
      case 'snippet-settings':
        this.commands.openSettings();
        return;
      case 'toggle-console':
        this.commands.toggleConsole();
        return;
      case 'rerun-preview':
        this.commands.rerunPreview();
        return;
      case 'format-pane':
        this.commands.formatPane();
        return;
      case 'focus-html':
        this.commands.focusPane('html');
        return;
      case 'focus-css':
        this.commands.focusPane('css');
        return;
      case 'focus-js':
        this.commands.focusPane('js');
        return;
    }
  }

  openShortcuts() {
    if (this.matDialog.getDialogById('keyboard-shortcuts')) return;
    this.dialogs.open(KeyboardShortcutsDialogComponent, 'lg', { id: 'keyboard-shortcuts' });
  }

  private editorActive(): boolean {
    return this.editorUi.editorOpen() && this.commands.hasSnippet();
  }
}
