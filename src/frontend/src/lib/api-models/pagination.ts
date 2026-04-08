import type { PaginationMetaResponse as ApiPaginationMetaResponse } from '@ssn/backend-api';

export type PaginationMetaResponse = {
  limit: bigint;
  page: bigint;
  totalItems: bigint;
  totalPages: bigint;
};

export function mapPaginationMetaResponse(
  res: ApiPaginationMetaResponse,
): PaginationMetaResponse {
  return {
    limit: res.limit,
    page: res.page,
    totalItems: res.total_items,
    totalPages: res.total_pages,
  };
}
