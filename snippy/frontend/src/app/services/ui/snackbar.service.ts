import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class SnackbarService {
  private snackBar = inject(MatSnackBar);

  //#region Variants

  /** Success toast (green panel). */
  success(message: string, duration: number = 3000) {
    this.show(message, 'success-snackbar', duration);
  }

  /** Error toast (red panel, longer default duration). */
  error(message: string, duration: number = 5000) {
    this.show(message, 'error-snackbar', duration);
  }

  /** Neutral info toast. */
  info(message: string, duration: number = 3000) {
    this.show(message, 'info-snackbar', duration);
  }

  /** Warning toast. */
  warning(message: string, duration: number = 4000) {
    this.show(message, 'warning-snackbar', duration);
  }

  //#endregion Variants

  /** Open a Material snackbar with the given panel class. */
  private show(message: string, panelClass: string, duration: number) {
    const config: MatSnackBarConfig = {
      duration,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
      panelClass: [panelClass],
    };

    this.snackBar.open(message, 'Close', config);
  }
}
