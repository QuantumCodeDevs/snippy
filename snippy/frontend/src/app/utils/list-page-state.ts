import { PageEvent } from '@angular/material/paginator';

export const DEFAULT_PAGE_SIZE = 12;

/**
 * Search + pagination + sort state for one list surface (a page or a tab).
 * Pages own one instance per list instead of hand-rolling parallel
 * `pageIndex` / `pageSize` / `searchQuery` fields and handlers.
 */
export class ListPageState<S extends string = string> {
  pageIndex = 0;
  pageSize: number;
  searchQuery = '';
  sort: S;

  constructor(
    private readonly loader: (state: ListPageState<S>) => unknown,
    options: { pageSize?: number; sort?: S } = {}
  ) {
    this.pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    this.sort = options.sort ?? ('newest' as S);
  }

  /** 1-based page number expected by the API. */
  get page(): number {
    return this.pageIndex + 1;
  }

  /** Trimmed query, or undefined so callers can omit the param entirely. */
  get query(): string | undefined {
    return this.searchQuery.trim() || undefined;
  }

  reload() {
    return this.loader(this);
  }

  onSearch(searchQuery: string) {
    this.searchQuery = searchQuery;
    this.pageIndex = 0;
    return this.reload();
  }

  onSortChange(sort: S) {
    this.sort = sort;
    this.pageIndex = 0;
    return this.reload();
  }

  onPageChange(event: PageEvent) {
    this.setPage(event);
    return this.reload();
  }

  /** Page update without a reload, for lists paginated client-side. */
  setPage(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  reset() {
    this.pageIndex = 0;
    this.searchQuery = '';
  }
}
