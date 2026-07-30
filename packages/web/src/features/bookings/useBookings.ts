import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '@/services/api';
import { usePaginatedQuery } from '@/lib/usePaginatedQuery';
import type { ApiResponse, Booking, BookingSearchParams } from '@/types';

export function useMyBookings(params: BookingSearchParams = {}) {
  const { items: bookings, pagination, isLoading, error } = usePaginatedQuery<Booking>({
    queryKey: ['bookings', params],
    url: '/bookings',
    params,
  });

  return { bookings, pagination, isLoading, error };
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
