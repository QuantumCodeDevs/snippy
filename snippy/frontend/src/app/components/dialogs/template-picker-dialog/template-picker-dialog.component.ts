import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { SNIPPET_TEMPLATES, SnippetTemplate } from '@app/editor/snippet-templates';

@Component({
  selector: 'app-template-picker-dialog',
  imports: [MatDialogModule, MatButtonModule, MatDividerModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h2 mat-dialog-title>Start from a template</h2>
    <mat-dialog-content>
      <div class="grid gap-3 sm:grid-cols-2">
        @for (tpl of templates; track tpl.id) {
          <button
            type="button"
            class="rounded-lg border border-line p-3 text-left hover:bg-raised"
            (click)="dialogRef.close(tpl)"
          >
            <div class="font-medium text-ink">{{ tpl.name }}</div>
            <div class="mt-1 text-sm text-faint">{{ tpl.description }}</div>
          </button>
        }
      </div>
    </mat-dialog-content>
    <mat-divider></mat-divider>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(null)">Skip</button>
    </mat-dialog-actions>
  `,
})
export class TemplatePickerDialogComponent {
  dialogRef = inject(MatDialogRef<TemplatePickerDialogComponent, SnippetTemplate | null>);
  templates = SNIPPET_TEMPLATES;
}
