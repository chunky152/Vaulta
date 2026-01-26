import { create } from 'zustand';
import type {
  LocationWithDistance,
  Location,
  StorageUnit,
  NearbySearchParams,
  ApiResponse,
  PaginatedResponse,
} from '@/types';
import api, { getErrorMessage } from '@/services/api';

interface LocationState {
  locations: LocationWithDistance[];
  featuredLocations: Location[];
  selectedLocation: Location | null;
  locationUnits: StorageUnit[];
  userPosition: { latitude: number; longitude: number } | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // Actions
  setUserPosition: (position: { latitude: number; longitude: number } | null) => void;
  searchNearby: (params: NearbySearchParams) => Promise<void>;
  fetchFeaturedLocations: () => Promise<void>;
  fetchLocationById: (id: string) => Promise<void>;
  fetchLocationBySlug: (slug: string) => Promise<void>;
  fetchLocationUnits: (locationId: string) => Promise<void>;
  clearError: () => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  locations: [],
  featuredLocations: [],
  selectedLocation: null,
  locationUnits: [],
  userPosition: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },

  setUserPosition: (position) => set({ userPosition: position }),

  searchNearby: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<PaginatedResponse<LocationWithDistance>>(
        '/locations/nearby',
        { params }
      );

      if (response.data.success && response.data.data) {
        set({
          locations: response.data.data,
          pagination: response.data.pagination,
          isLoading: false,
        });
      }
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
    }
  },

  fetchFeaturedLocations: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<ApiResponse<{ locations: Location[] }>>(
        '/locations/featured'
      );

      if (response.data.success && response.data.data) {
        set({
          featuredLocations: response.data.data.locations,
          isLoading: false,
        });
      }
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
    }
  },

  fetchLocationById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<ApiResponse<{ location: Location }>>(
        `/locations/${id}`
      );

      if (response.data.success && response.data.data) {
        set({
          selectedLocation: response.data.data.location,
          isLoading: false,
        });
      }
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
    }
  },

  fetchLocationBySlug: async (slug) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<ApiResponse<{ location: Location }>>(
        `/locations/slug/${slug}`
      );

      if (response.data.success && response.data.data) {
        set({
          selectedLocation: response.data.data.location,
          isLoading: false,
        });
      }
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
    }
  },

  fetchLocationUnits: async (locationId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<
        ApiResponse<{ location: Location & { units: StorageUnit[] } }>
      >(`/locations/${locationId}/units`);

      if (response.data.success && response.data.data) {
        set({
          selectedLocation: response.data.data.location,
          locationUnits: response.data.data.location.units,
          isLoading: false,
        });
      }
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
    }
  },

  clearError: () => set({ error: null }),
}));
