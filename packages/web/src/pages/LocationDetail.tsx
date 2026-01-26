import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useLocationStore } from '@/stores/location.store';
import { useAuthStore } from '@/stores/auth.store';
import {
  MapPin,
  Clock,
  Phone,
  Mail,
  Star,
  Shield,
  Thermometer,
  Wifi,
  Camera,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { StorageUnit } from '@/types';

const markerIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const sizeLabels: Record<string, string> = {
  SMALL: 'Small',
  MEDIUM: 'Medium',
  LARGE: 'Large',
  XL: 'Extra Large',
};

const amenityIcons: Record<string, React.ReactNode> = {
  '24/7 Access': <Clock className="h-4 w-4" />,
  'Climate Controlled': <Thermometer className="h-4 w-4" />,
  'Security Cameras': <Camera className="h-4 w-4" />,
  'On-site Security': <Shield className="h-4 w-4" />,
  'Free WiFi': <Wifi className="h-4 w-4" />,
};

export function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentLocation, units, fetchLocationById, fetchLocationUnits, isLoading } = useLocationStore();
  const { isAuthenticated } = useAuthStore();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchLocationById(id);
      fetchLocationUnits(id);
    }
  }, [id, fetchLocationById, fetchLocationUnits]);

  const handleBookUnit = (unit: StorageUnit) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/booking/${unit.id}` } });
      return;
    }
    navigate(`/booking/${unit.id}`);
  };

  const nextImage = () => {
    if (currentLocation?.images) {
      setCurrentImageIndex((prev) =>
        prev === currentLocation.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (currentLocation?.images) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? currentLocation.images.length - 1 : prev - 1
      );
    }
  };

  const filteredUnits = selectedSize
    ? units.filter((unit) => unit.size === selectedSize)
    : units;

  const availableUnits = filteredUnits.filter((unit) => unit.status === 'AVAILABLE');

  if (isLoading && !currentLocation) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-96 bg-muted rounded-lg" />
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-1/4" />
        </div>
      </div>
    );
  }

  if (!currentLocation) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Location not found</h1>
        <Button onClick={() => navigate('/search')}>Back to Search</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Image Gallery */}
      <div className="relative h-96 bg-muted">
        {currentLocation.images && currentLocation.images.length > 0 ? (
          <>
            <img
              src={currentLocation.images[currentImageIndex]}
              alt={currentLocation.name}
              className="w-full h-full object-cover"
            />
            {currentLocation.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {currentLocation.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <MapPin className="h-24 w-24 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Location Info */}
            <div>
              <h1 className="text-3xl font-bold mb-2">{currentLocation.name}</h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{currentLocation.address}, {currentLocation.city}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span>4.8 (124 reviews)</span>
                </div>
              </div>
            </div>

            {/* Amenities */}
            {currentLocation.amenities && currentLocation.amenities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Amenities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {currentLocation.amenities.map((amenity, index) => (
                      <div key={index} className="flex items-center gap-2">
                        {amenityIcons[amenity] || <Shield className="h-4 w-4" />}
                        <span>{amenity}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Available Units */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Available Units ({availableUnits.length})</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={selectedSize === null ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedSize(null)}
                    >
                      All
                    </Button>
                    {['SMALL', 'MEDIUM', 'LARGE', 'XL'].map((size) => (
                      <Button
                        key={size}
                        variant={selectedSize === size ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedSize(size)}
                      >
                        {sizeLabels[size]}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {availableUnits.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No available units matching your criteria
                  </p>
                ) : (
                  <div className="grid gap-4">
                    {availableUnits.map((unit) => (
                      <div
                        key={unit.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <div className="font-medium">
                            Unit {unit.unitNumber} - {sizeLabels[unit.size]}
                          </div>
                          {unit.dimensions && (
                            <div className="text-sm text-muted-foreground">
                              {unit.dimensions.width}m × {unit.dimensions.height}m × {unit.dimensions.depth}m
                            </div>
                          )}
                          <div className="flex gap-2 mt-2">
                            {unit.features?.climateControlled && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Climate Controlled
                              </span>
                            )}
                            {unit.features?.secure && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                Secure
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">
                            ${unit.basePriceDaily}<span className="text-sm font-normal">/day</span>
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            ${unit.basePriceMonthly}/month
                          </div>
                          <Button size="sm" onClick={() => handleBookUnit(unit)}>
                            Book Now
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Map */}
            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 rounded-lg overflow-hidden">
                  <MapContainer
                    center={[currentLocation.latitude, currentLocation.longitude]}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker
                      position={[currentLocation.latitude, currentLocation.longitude]}
                      icon={markerIcon}
                    >
                      <Popup>{currentLocation.name}</Popup>
                    </Marker>
                  </MapContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentLocation.contactPhone && (
                  <a
                    href={`tel:${currentLocation.contactPhone}`}
                    className="flex items-center gap-3 text-muted-foreground hover:text-foreground"
                  >
                    <Phone className="h-5 w-5" />
                    <span>{currentLocation.contactPhone}</span>
                  </a>
                )}
                {currentLocation.contactEmail && (
                  <a
                    href={`mailto:${currentLocation.contactEmail}`}
                    className="flex items-center gap-3 text-muted-foreground hover:text-foreground"
                  >
                    <Mail className="h-5 w-5" />
                    <span>{currentLocation.contactEmail}</span>
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Operating Hours */}
            {currentLocation.operatingHours && (
              <Card>
                <CardHeader>
                  <CardTitle>Operating Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {Object.entries(currentLocation.operatingHours).map(([day, hours]) => (
                      <div key={day} className="flex justify-between">
                        <span className="capitalize">{day}</span>
                        <span className="text-muted-foreground">
                          {hours === 'closed' ? 'Closed' : hours}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Facts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Units</span>
                  <span className="font-medium">{units.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Available</span>
                  <span className="font-medium text-green-600">
                    {availableUnits.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Starting from</span>
                  <span className="font-medium">
                    ${Math.min(...units.map((u) => u.basePriceDaily || 0))}/day
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
