import { create } from 'zustand';
import type {
  Booking,
  StorageUnit,
  PriceCalculation,
  ApiResponse,
  PaginatedResponse,
  BookingSearchParams,
} from '@/types';
import api, { getErrorMessage } from '@/services/api';

interface BookingState {
  bookings: Booking[];
  selectedBooking: Booking | null;
  selectedUnit: StorageUnit | null;
  priceCalculation: PriceCalculation | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // Actions
  setSelectedUnit: (unit: StorageUnit | null) => void;
  fetchMyBookings: (params?: BookingSearchParams) => Promise<void>;
  fetchUserBookings: (params?: BookingSearchParams) => Promise<void>;
  fetchBookingById: (id: string) => Promise<void>;
  calculatePrice: (unitId: string, startTime: Date, endTime: Date) => Promise<void>;
  createBooking: (data: {
    unitId: string;
    startTime: Date;
    endTime: Date;
    notes?: string;
  }) => Promise<Booking>;
  cancelBooking: (id: string, reason?: string) => Promise<void>;
  checkIn: (id: string) => Promise<void>;
  checkOut: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: [],
  selectedBooking: null,
  selectedUnit: null,
  priceCalculation: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },

  setSelectedUnit: (unit) => set({ selectedUnit: unit }),

  // fetchUserBookings is an alias for fetchMyBookings
  fetchUserBookings: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<PaginatedResponse<Booking>>('/bookings', {
        params,
      });

      if (response.data.success && response.data.data) {
        set({
          bookings: response.data.data,
          pagination: response.data.pagination,
          isLoading: false,
        });
      }
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
    }
  },

  fetchMyBookings: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<PaginatedResponse<Booking>>('/bookings', {
        params,
      });

      if (response.data.success && response.data.data) {
        set({
          bookings: response.data.data,
          pagination: response.data.pagination,
          isLoading: false,
        });
      }
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
    }
  },

  fetchBookingById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<ApiResponse<{ booking: Booking }>>(
        `/bookings/${id}`
      );

      if (response.data.success && response.data.data) {
        set({
          selectedBooking: response.data.data.booking,
          isLoading: false,
        });
      }
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
    }
  },

  calculatePrice: async (unitId, startTime, endTime) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<ApiResponse<{ pricing: PriceCalculation }>>(
        '/bookings/calculate-price',
        { unitId, startTime, endTime }
      );

      if (response.data.success && response.data.data) {
        set({
          priceCalculation: response.data.data.pricing,
          isLoading: false,
        });
      }
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
    }
  },

  createBooking: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<ApiResponse<{ booking: Booking }>>(
        '/bookings',
        data
      );

      if (response.data.success && response.data.data) {
        const booking = response.data.data.booking;
        set({
          selectedBooking: booking,
          isLoading: false,
        });
        return booking;
      }
      throw new Error('Failed to create booking');
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
      throw error;
    }
  },

  cancelBooking: async (id, reason) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/bookings/${id}/cancel`, { reason });

      // Update local state
      set((state) => ({
        bookings: state.bookings.map((b) =>
          b.id === id ? { ...b, status: 'CANCELLED' as const } : b
        ),
        selectedBooking:
          state.selectedBooking?.id === id
            ? { ...state.selectedBooking, status: 'CANCELLED' as const }
            : state.selectedBooking,
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
      throw error;
    }
  },

  checkIn: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<ApiResponse<{ booking: Booking }>>(
        `/bookings/${id}/check-in`
      );

      if (response.data.success && response.data.data) {
        const booking = response.data.data.booking;
        set((state) => ({
          bookings: state.bookings.map((b) => (b.id === id ? booking : b)),
          selectedBooking: booking,
          isLoading: false,
        }));
      }
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
      throw error;
    }
  },

  checkOut: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<ApiResponse<{ booking: Booking }>>(
        `/bookings/${id}/check-out`
      );

      if (response.data.success && response.data.data) {
        const booking = response.data.data.booking;
        set((state) => ({
          bookings: state.bookings.map((b) => (b.id === id ? booking : b)),
          selectedBooking: booking,
          isLoading: false,
        }));
      }
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
