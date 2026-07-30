import { useQuery } from '@tanstack/react-query';
import api, { getErrorMessage } from '@/services/api';
import type { PaginatedResponse } from '@/types';

type Pagination = PaginatedResponse<unknown>['pagination'];

export const emptyPagination: Pagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
};

interface UsePaginatedQueryOptions<TParams> {
  queryKey: readonly unknown[];
  url: string;
  params?: TParams;
  enabled?: boolean;
}

// Shared fetch/unwrap logic for endpoints returning PaginatedResponse<T>
export function usePaginatedQuery<T, TParams = unknown>({
  queryKey,
  url,
  params,
  enabled,
}: UsePaginatedQueryOptions<TParams>) {
  const query = useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<T>>(url, { params });
      return {
        items: response.data.data ?? [],
        pagination: response.data.pagination ?? emptyPagination,
      };
    },
  });

  return {
    items: query.data?.items ?? [],
    pagination: query.data?.pagination ?? emptyPagination,
    isLoading: query.isLoading,
    error: query.error ? getErrorMessage(query.error) : null,
    refetch: query.refetch,
  };
}
