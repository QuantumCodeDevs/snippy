import { Component, DOCUMENT, inject, ChangeDetectionStrategy } from '@angular/core';

import { AuthStoreService } from '@app/services/stores/auth.store.service';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';
import { AssetsDialogComponent } from '@app/components/dialogs/assets-dialog/assets-dialog.component';
import { DialogService } from '@app/services/ui/dialog.service';
import { NavigationService } from '@app/services/ui/navigation.service';
import { userInitials } from '@app/utils/user-initials';

@Component({
  selector: 'app-user-menu',
  imports: [MatMenuModule, MatButtonModule],
  templateUrl: './user-menu.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class UserMenuComponent {
  get user() {
    return this.authStoreService.user;
  }

  document = inject(DOCUMENT);
  private navigation = inject(NavigationService);
  private authStoreService = inject(AuthStoreService);
  private snippetStoreService = inject(SnippetStoreService);
  private dialogService = inject(DialogService);

  initials(): string {
    const u = this.user();
    return userInitials(u?.userName, u?.displayName);
  }

  async logout() {
    if (this.snippetStoreService.isDirty()) {
      const ok = await this.dialogService.confirm({
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Are you sure you want to logout?',
        confirmText: 'Logout',
        cancelText: 'Cancel',
      });
      if (ok) {
        this.authStoreService.logout();
      }
    } else {
      this.authStoreService.logout();
    }
  }

  settings() {
    this.navigation.toSettings();
  }

  home() {
    this.navigation.toHome();
  }

  profile() {
    this.navigation.toCurrentUserProfile();
  }

  assets() {
    this.dialogService.open(AssetsDialogComponent, 'lg');
  }

  createNewSnippet() {
    this.navigation.toNewSnippet();
  }
}
