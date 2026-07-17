import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  PaginatedResponse,
  Booking,
  BookingSearchParams,
} from '@/types';

const emptyPagination = { page: 1, limit: 20, total: 0, totalPages: 0 };

export function useMyBookings(params: BookingSearchParams = {}) {
  const query = useQuery({
    queryKey: ['bookings', params],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Booking>>('/bookings', {
        params,
      });
      return {
        bookings: response.data.data ?? [],
        pagination: response.data.pagination ?? emptyPagination,
      };
    },
  });

  return {
    bookings: query.data?.bookings ?? [],
    pagination: query.data?.pagination ?? emptyPagination,
    isLoading: query.isLoading,
    error: query.error ? getErrorMessage(query.error) : null,
  };
}

export function useBooking(id: string | undefined) {
  const query = useQuery({
    queryKey: ['bookings', 'detail', id],
    enabled: !!id,
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ booking: Booking }>>(
        `/bookings/${id}`
      );
      return response.data.data?.booking ?? null;
    },
  });

  return {
    booking: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? getErrorMessage(query.error) : null,
  };
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      unitId: string;
      startTime: Date;
      endTime: Date;
      notes?: string;
    }) => {
      const response = await api.post<ApiResponse<{ booking: Booking }>>(
        '/bookings',
        data
      );
      const booking = response.data.data?.booking;
      if (!booking) {
        throw new Error('Failed to create booking');
      }
      return booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

function useBookingAction(action: 'cancel' | 'check-in' | 'check-out') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await api.post<ApiResponse<{ booking: Booking }>>(
        `/bookings/${id}/${action}`,
        reason !== undefined ? { reason } : undefined
      );
      return response.data.data?.booking ?? null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useCancelBooking() {
  return useBookingAction('cancel');
}

export function useCheckIn() {
  return useBookingAction('check-in');
}

export function useCheckOut() {
  return useBookingAction('check-out');
}
