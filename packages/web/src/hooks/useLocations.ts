import { useQuery } from '@tanstack/react-query';
import api, { getErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  PaginatedResponse,
  Location,
  LocationWithDistance,
  StorageUnit,
  NearbySearchParams,
} from '@/types';

const emptyPagination = { page: 1, limit: 20, total: 0, totalPages: 0 };

export function useNearbyLocations(params: NearbySearchParams | null) {
  const query = useQuery({
    queryKey: ['locations', 'nearby', params],
    enabled: params !== null,
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<LocationWithDistance>>(
        '/locations/nearby',
        { params }
      );
      return {
        locations: response.data.data ?? [],
        pagination: response.data.pagination ?? emptyPagination,
      };
    },
  });

  return {
    locations: query.data?.locations ?? [],
    pagination: query.data?.pagination ?? emptyPagination,
    isLoading: query.isLoading,
    error: query.error ? getErrorMessage(query.error) : null,
    refetch: query.refetch,
  };
}

export function useFeaturedLocations() {
  const query = useQuery({
    queryKey: ['locations', 'featured'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ locations: Location[] }>>(
        '/locations/featured'
      );
      return response.data.data?.locations ?? [];
    },
  });

  return {
    locations: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? getErrorMessage(query.error) : null,
  };
}

// Accepts either a Mongo ObjectId or a slug — search results link by slug,
// while other flows pass ids.
export function useLocation(idOrSlug: string | undefined) {
  const query = useQuery({
    queryKey: ['locations', idOrSlug],
    enabled: !!idOrSlug,
    queryFn: async () => {
      const isObjectId = /^[0-9a-f]{24}$/i.test(idOrSlug as string);
      const path = isObjectId
        ? `/locations/${idOrSlug}`
        : `/locations/slug/${idOrSlug}`;
      const response = await api.get<ApiResponse<{ location: Location }>>(path);
      return response.data.data?.location ?? null;
    },
  });

  return {
    location: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? getErrorMessage(query.error) : null,
  };
}

export function useLocationUnits(locationId: string | undefined) {
  const query = useQuery({
    queryKey: ['locations', locationId, 'units'],
    enabled: !!locationId,
    queryFn: async () => {
      const response = await api.get<
        ApiResponse<{ location: Location & { units: StorageUnit[] } }>
      >(`/locations/${locationId}/units`);
      return response.data.data?.location.units ?? [];
    },
  });

  return {
    units: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? getErrorMessage(query.error) : null,
  };
}
