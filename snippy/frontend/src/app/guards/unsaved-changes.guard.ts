// Unsaved changes guard for confirming before leaving pages with unsaved changes.

import { CanDeactivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';
import { DialogService } from '@app/services/ui/dialog.service';

/** A routed page that tracks its own unsaved edits (e.g. settings). */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

function hasOwnCheck(component: unknown): component is HasUnsavedChanges {
  return typeof (component as Partial<HasUnsavedChanges> | null)?.hasUnsavedChanges === 'function';
}

/** Ask before leaving. Pages may report their own state; the editor uses the open snippet. */
export const unsavedChangesGuard: CanDeactivateFn<unknown> = (component) => {
  const dirty = hasOwnCheck(component)
    ? component.hasUnsavedChanges()
    : inject(SnippetStoreService).isDirty();

  if (!dirty) {
    return true;
  }

  return inject(DialogService).confirm({
    title: 'Unsaved Changes',
    message: 'You have unsaved changes. Are you sure you want to leave?',
    confirmText: 'Leave',
    cancelText: 'Stay',
  });
};
