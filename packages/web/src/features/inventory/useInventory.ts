import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  PaginatedResponse,
  InventoryItem,
  InventorySummary,
  InventorySearchParams,
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
} from '@/types';

const emptyPagination = { page: 1, limit: 20, total: 0, totalPages: 0 };

export function useInventory(params: InventorySearchParams = {}) {
  const query = useQuery({
    queryKey: ['inventory', params],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<InventoryItem>>(
        '/inventory',
        { params }
      );
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
  };
}

export function useInventorySummary() {
  const query = useQuery({
    queryKey: ['inventory', 'summary'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ summary: InventorySummary }>>(
        '/inventory/summary'
      );
      return response.data.data?.summary ?? null;
    },
  });

  return {
    summary: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? getErrorMessage(query.error) : null,
  };
}

export function useAddInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      data,
    }: {
      bookingId: string;
      data: CreateInventoryItemInput;
    }) => {
      const response = await api.post<ApiResponse<{ item: InventoryItem }>>(
        `/bookings/${bookingId}/inventory`,
        data
      );
      const item = response.data.data?.item;
      if (!item) {
        throw new Error('Failed to add item');
      }
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      data,
    }: {
      itemId: string;
      data: UpdateInventoryItemInput;
    }) => {
      const response = await api.put<ApiResponse<{ item: InventoryItem }>>(
        `/inventory/${itemId}`,
        data
      );
      const item = response.data.data?.item;
      if (!item) {
        throw new Error('Failed to update item');
      }
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/inventory/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
