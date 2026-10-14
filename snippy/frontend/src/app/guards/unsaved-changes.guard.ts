// Unsaved changes guard for confirming before leaving pages with unsaved changes.

import { CanDeactivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';
import { DialogService } from '@app/services/ui/dialog.service';

export const unsavedChangesGuard: CanDeactivateFn<any> = () => {
  const snippetStoreService = inject(SnippetStoreService);
  const dialogService = inject(DialogService);

  if (!snippetStoreService.isDirty()) {
    return true;
  }

  return dialogService.confirm({
    title: 'Unsaved Changes',
    message: 'You have unsaved changes. Are you sure you want to leave?',
    confirmText: 'Leave',
    cancelText: 'Stay',
  });
};
