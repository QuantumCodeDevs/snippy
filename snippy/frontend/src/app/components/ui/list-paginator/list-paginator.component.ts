import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

/** Centered paginator with the page sizes used across Snippy's list grids. */
@Component({
  selector: 'app-list-paginator',
  imports: [MatPaginatorModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (!hideWhenSinglePage || total > pageSize || pageIndex > 0) {
      <div class="flex justify-center p-3">
        <mat-paginator
          [length]="total"
          [pageSize]="pageSize"
          [pageSizeOptions]="pageSizeOptions"
          [pageIndex]="pageIndex"
          (page)="pageChange.emit($event)"
          showFirstLastButtons
        >
        </mat-paginator>
      </div>
    }
  `,
})
export class ListPaginatorComponent {
  @Input() total = 0;
  @Input() pageSize = 12;
  @Input() pageIndex = 0;
  @Input() pageSizeOptions = [12, 24, 48];
  @Input() hideWhenSinglePage = false;
  @Output() pageChange = new EventEmitter<PageEvent>();
}
