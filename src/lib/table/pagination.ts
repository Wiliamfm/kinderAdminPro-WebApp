export const DEFAULT_TABLE_PAGE_SIZE = 10;

export type PaginatedListResult<TItem> = {
  items: TItem[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
};

export function getSafeTotalPages(totalPages: number): number {
  return Math.max(1, totalPages);
}

export function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(1, page), getSafeTotalPages(totalPages));
}
