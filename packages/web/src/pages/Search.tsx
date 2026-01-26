import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { LocationMap } from '@/components/map/LocationMap';
import { useLocationStore } from '@/stores/location.store';
import { useGeolocation } from '@/hooks/useGeolocation';
import { formatDistance, formatCurrency } from '@/lib/utils';
import type { LocationWithDistance } from '@/types';
import {
  MapPin,
  Search,
  Star,
  List,
  Map as MapIcon,
  Loader2,
  Filter,
} from 'lucide-react';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedLocation, setSelectedLocation] =
    useState<LocationWithDistance | null>(null);
  const [radius, setRadius] = useState(10);

  const { position, isLoading: geoLoading, error: geoError } = useGeolocation();
  const {
    locations,
    searchNearby,
    setUserPosition,
    isLoading,
    error,
    pagination,
  } = useLocationStore();

  // Get initial coordinates from URL or geolocation
  useEffect(() => {
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (lat && lng) {
      const coords = { latitude: parseFloat(lat), longitude: parseFloat(lng) };
      setUserPosition(coords);
      searchNearby({ ...coords, radiusKm: radius });
    } else if (position) {
      setUserPosition(position);
      searchNearby({ ...position, radiusKm: radius });
    }
  }, [position, searchParams, searchNearby, setUserPosition, radius]);

  const handleSearch = () => {
    if (position) {
      searchNearby({ ...position, radiusKm: radius });
    }
  };

  const handleLocationClick = (location: LocationWithDistance) => {
    setSelectedLocation(location);
    setViewMode('list');
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Search Header */}
      <div className="bg-background border-b py-6">
        <div className="container">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                {geoLoading
                  ? 'Getting your location...'
                  : position
                    ? 'Searching near your location'
                    : 'Enable location to find storage near you'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Radius:</label>
                <select
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={25}>25 km</option>
                  <option value={50}>50 km</option>
                </select>
              </div>
              <Button onClick={handleSearch} disabled={!position || isLoading}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Storage Near You</h1>
            <p className="text-muted-foreground">
              {pagination.total} location{pagination.total !== 1 ? 's' : ''}{' '}
              found within {radius} km
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4 mr-1" />
              List
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('map')}
            >
              <MapIcon className="h-4 w-4 mr-1" />
              Map
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : viewMode === 'map' ? (
          <div className="h-[600px] rounded-lg overflow-hidden border">
            <LocationMap
              locations={locations}
              userPosition={position}
              onLocationClick={handleLocationClick}
              selectedLocationId={selectedLocation?.id}
            />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Location List */}
            <div className="lg:col-span-2 space-y-4">
              {locations.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">No locations found</h3>
                    <p className="text-muted-foreground">
                      Try increasing the search radius or searching in a
                      different area.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                locations.map((location) => (
                  <Link
                    key={location.id}
                    to={`/locations/${location.slug}`}
                    className="block"
                  >
                    <Card
                      className={`overflow-hidden hover:shadow-lg transition-shadow ${
                        selectedLocation?.id === location.id
                          ? 'ring-2 ring-primary'
                          : ''
                      }`}
                    >
                      <div className="flex flex-col md:flex-row">
                        <div className="md:w-48 h-40 md:h-auto bg-muted flex-shrink-0">
                          {location.images[0] ? (
                            <img
                              src={location.images[0]}
                              alt={location.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MapPin className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <CardContent className="flex-1 p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">
                                {location.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {location.address}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {location.city}, {location.country}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center">
                                <Star className="h-4 w-4 text-yellow-500 mr-1" />
                                <span className="font-medium">
                                  {location.rating.toFixed(1)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {location.reviewCount} reviews
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex flex-wrap gap-2">
                              {location.amenities.slice(0, 3).map((amenity) => (
                                <span
                                  key={amenity}
                                  className="text-xs bg-muted px-2 py-1 rounded"
                                >
                                  {amenity.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-primary">
                                {formatDistance(location.distance)}
                              </p>
                              {location.availableUnits !== undefined && (
                                <p className="text-xs text-green-600">
                                  {location.availableUnits} available
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  </Link>
                ))
              )}
            </div>

            {/* Mini Map */}
            <div className="hidden lg:block">
              <div className="sticky top-24">
                <div className="h-[400px] rounded-lg overflow-hidden border">
                  <LocationMap
                    locations={locations}
                    userPosition={position}
                    onLocationClick={handleLocationClick}
                    selectedLocationId={selectedLocation?.id}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
