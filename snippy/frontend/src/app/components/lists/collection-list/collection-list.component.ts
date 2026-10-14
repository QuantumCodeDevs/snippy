import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { Collection } from '@app/models/base-models/collection';
import { MatDividerModule } from '@angular/material/divider';
import { ListToolbarComponent } from '@app/components/ui/list-toolbar/list-toolbar.component';
import { ListEmptyStateComponent } from '@app/components/ui/list-empty-state/list-empty-state.component';
import { ListPaginatorComponent } from '@app/components/ui/list-paginator/list-paginator.component';

@Component({
  selector: 'app-collection-list',
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    ListToolbarComponent,
    ListEmptyStateComponent,
    ListPaginatorComponent,
  ],
  templateUrl: './collection-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: 'block' },
})
export class CollectionListComponent {
  @Input() collections: Collection[] = [];
  @Input() total = 0;
  @Input() pageSize = 6;
  @Input() pageIndex = 0;
  @Input() showNewButton = false;
  @Input() showDelete = false;
  @Output() searchChange = new EventEmitter<string>();
  @Output() pageChange = new EventEmitter<PageEvent>();
  @Output() createNew = new EventEmitter<void>();
  @Output() openCollection = new EventEmitter<Collection>();
  @Output() deleteCollection = new EventEmitter<Collection>();

  onCreate() {
    this.createNew.emit();
  }

  onOpen(collection: Collection) {
    this.openCollection.emit(collection);
  }

  onDelete(collection: Collection, event: Event) {
    event.stopPropagation();
    this.deleteCollection.emit(collection);
  }
}
