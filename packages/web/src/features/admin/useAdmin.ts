import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '@/services/api';
import { usePaginatedQuery } from '@/lib/usePaginatedQuery';
import type { ApiResponse, Booking, StorageLocation } from '@/types';

interface AdminDashboardStats {
  users: { total: number; newThisMonth: number };
  bookings: { total: number; active: number; completed: number };
  revenue: { total: number; thisMonth: number };
  locations: { total: number };
  units: { total: number; occupied: number; occupancyRate: number };
}

export function useAdminStats() {
  const query = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<AdminDashboardStats>>('/admin/dashboard');
      return response.data.data ?? null;
    },
  });

  return {
    stats: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? getErrorMessage(query.error) : null,
  };
}

// admin.controller.ts nests { bookings/users, pagination } under `data`,
// unlike the standard PaginatedResponse shape, so these can't use usePaginatedQuery.
interface AdminPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const emptyAdminPagination: AdminPagination = { page: 1, limit: 20, total: 0, totalPages: 1 };

interface AdminBookingsParams {
  page?: number;
  limit?: number;
  status?: string;
}

export function useAdminBookings(params: AdminBookingsParams = {}) {
  const query = useQuery({
    queryKey: ['admin', 'bookings', params],
    queryFn: async () => {
      const response = await api.get<
        ApiResponse<{ bookings: Booking[]; pagination: AdminPagination }>
      >('/admin/bookings', { params });
      return {
        bookings: response.data.data?.bookings ?? [],
        pagination: response.data.data?.pagination ?? emptyAdminPagination,
      };
    },
  });

  return {
    bookings: query.data?.bookings ?? [],
    pagination: query.data?.pagination ?? emptyAdminPagination,
    isLoading: query.isLoading,
    error: query.error ? getErrorMessage(query.error) : null,
    refetch: query.refetch,
  };
}

export interface AdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: string;
  emailVerified: boolean;
  loyaltyPoints: number;
  createdAt: string;
}

interface AdminUsersParams {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
}

export function useAdminUsers(params: AdminUsersParams = {}) {
  const query = useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: async () => {
      const response = await api.get<
        ApiResponse<{ users: AdminUser[]; pagination: AdminPagination }>
      >('/admin/users', { params });
      return {
        users: response.data.data?.users ?? [],
        pagination: response.data.data?.pagination ?? emptyAdminPagination,
      };
    },
  });

  return {
    users: query.data?.users ?? [],
    pagination: query.data?.pagination ?? emptyAdminPagination,
    isLoading: query.isLoading,
    error: query.error ? getErrorMessage(query.error) : null,
  };
}

export function useAdminLocations() {
  const { items: locations, isLoading, error } = usePaginatedQuery<StorageLocation>({
    queryKey: ['locations'],
    url: '/locations',
    params: { limit: 100 },
  });

  return { locations, isLoading, error };
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/locations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
