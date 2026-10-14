import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { ExternalResourcesListComponent } from '@app/components/lists/external-resources-list/external-resources-list.component';
import { CdnResource } from '@app/models/extra-models/cdnLibrary';
import { Snippet } from '@app/models/base-models/snippet';
import { DialogService } from '@app/services/ui/dialog.service';

export type SnippetSettingsDialogData = Snippet & { guestMode?: boolean };

@Component({
  selector: 'app-snippet-settings-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatTabsModule,
    MatIconModule,
    MatDividerModule,
    ExternalResourcesListComponent,
  ],
  templateUrl: './snippet-settings-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SnippetSettingsDialogComponent {
  dialogRef = inject(MatDialogRef<SnippetSettingsDialogComponent>);
  data = inject<SnippetSettingsDialogData>(MAT_DIALOG_DATA);
  dialogService = inject(DialogService);

  description: string;
  isPrivate: boolean;
  tags: string[];
  newTag: string = '';
  cssResources: CdnResource[] = [];
  jsResources: CdnResource[] = [];
  readonly guestMode: boolean;

  constructor() {
    this.guestMode = !!this.data.guestMode;
    this.description = this.data.description || '';
    this.isPrivate = !!this.data.isPrivate;
    this.tags = [...(this.data.tags || [])];
    const allResources = [...(this.data.cdnResources || [])];
    this.cssResources = allResources.filter((r) => r.resourceType === 'css');
    this.jsResources = allResources.filter((r) => r.resourceType === 'js');
  }

  addTag() {
    const tag = this.newTag.trim();
    if (tag && !this.tags.includes(tag)) {
      this.tags.push(tag);
      this.newTag = '';
    }
  }

  removeTag(tag: string) {
    this.tags = this.tags.filter((t) => t !== tag);
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSave() {
    // Combine CSS and JS resources into one array, filter out empty URLs
    const cdnResources = [
      ...this.cssResources
        .filter((r) => r.url && r.url.trim())
        .map((r) => ({ ...r, resourceType: 'css' })),
      ...this.jsResources
        .filter((r) => r.url && r.url.trim())
        .map((r) => ({ ...r, resourceType: 'js' })),
    ];

    // Validate all CDN URLs
    const invalidUrls = cdnResources.filter((r) => !r.url || !this.isValidUrl(r.url));
    if (invalidUrls.length > 0) {
      this.dialogService.error(
        'Invalid URL',
        'One or more CDN library URLs are invalid. Please enter valid URLs.'
      );
      return;
    }

    this.dialogRef.close({
      description: this.description,
      isPrivate: this.isPrivate,
      tags: this.tags,
      cdnResources,
    });
  }

  private isValidUrl(url: string): boolean {
    try {
      // Accepts http, https, protocol-relative, and localhost URLs
      const pattern = /^(https?:\/\/|\/\/|localhost|127\.0\.0\.1)/i;
      if (!pattern.test(url)) return false;
      new URL(url, 'http://dummybase'); // base for protocol-relative
      return true;
    } catch {
      return false;
    }
  }
}
