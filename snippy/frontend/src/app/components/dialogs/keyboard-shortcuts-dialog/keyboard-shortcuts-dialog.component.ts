import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { ShortcutListComponent } from '@app/components/ui/shortcut-list/shortcut-list.component';

/** Opened with `?`, from the command palette, or from settings. */
@Component({
  selector: 'app-keyboard-shortcuts-dialog',
  imports: [MatDialogModule, MatButtonModule, ShortcutListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>Keyboard shortcuts</h2>
    <mat-dialog-content>
      <app-shortcut-list />
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
})
export class KeyboardShortcutsDialogComponent {}
