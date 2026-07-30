import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '@/services/api';
import { usePaginatedQuery } from '@/lib/usePaginatedQuery';
import type {
  ApiResponse,
  InventoryItem,
  InventorySummary,
  InventorySearchParams,
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
} from '@/types';

export function useInventory(params: InventorySearchParams = {}) {
  const { items, pagination, isLoading, error } = usePaginatedQuery<InventoryItem>({
    queryKey: ['inventory', params],
    url: '/inventory',
    params,
  });

  return { items, pagination, isLoading, error };
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
