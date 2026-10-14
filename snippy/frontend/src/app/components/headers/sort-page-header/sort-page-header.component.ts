import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { SnippetSort } from '@app/services/stores/snippet.store.service';

export interface SortOption {
  value: SnippetSort;
  label: string;
}

@Component({
  selector: 'app-sort-page-header',
  imports: [MatFormFieldModule, MatSelectModule],
  templateUrl: './sort-page-header.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SortPageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() sort: SnippetSort = 'newest';
  @Input() sortOptions: SortOption[] = [
    { value: 'newest', label: 'Newest' },
    { value: 'views', label: 'Most Viewed' },
    { value: 'favorites', label: 'Most Favorited' },
    { value: 'forks', label: 'Most Forked' },
  ];

  @Output() sortChange = new EventEmitter<SnippetSort>();
}
