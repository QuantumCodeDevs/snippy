import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

/**
 * Search box plus optional "create" button above a list grid.
 * Search only fires on Enter; the field keeps its value across pagination.
 */
@Component({
  selector: 'app-list-toolbar',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './list-toolbar.component.html',
})
export class ListToolbarComponent {
  @Input() searchLabel = 'Search';
  @Input() actionLabel: string | null = null;
  @Input() actionIcon: string | null = null;
  @Output() search = new EventEmitter<string>();
  @Output() action = new EventEmitter<void>();

  searchQuery = '';

  submitSearch() {
    this.search.emit(this.searchQuery.trim());
  }
}
