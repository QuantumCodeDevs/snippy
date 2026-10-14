import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';

import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';

export interface AlertDialogData {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
}

@Component({
  selector: 'app-alert-dialog',
  imports: [MatDialogModule, MatButtonModule, MatDividerModule],
  templateUrl: './alert-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class AlertDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<AlertDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AlertDialogData
  ) {
    this.data.type = this.data.type || 'info';
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
