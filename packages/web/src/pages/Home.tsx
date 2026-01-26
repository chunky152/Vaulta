import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useLocationStore } from '@/stores/location.store';
import { useGeolocation } from '@/hooks/useGeolocation';
import { formatCurrency } from '@/lib/utils';
import {
  MapPin,
  Search,
  Shield,
  Clock,
  Smartphone,
  Star,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();
  const { position, isLoading: geoLoading } = useGeolocation();
  const {
    featuredLocations,
    fetchFeaturedLocations,
    setUserPosition,
    isLoading,
  } = useLocationStore();

  useEffect(() => {
    fetchFeaturedLocations();
  }, [fetchFeaturedLocations]);

  useEffect(() => {
    if (position) {
      setUserPosition(position);
    }
  }, [position, setUserPosition]);

  const handleQuickSearch = () => {
    if (position) {
      navigate(`/search?lat=${position.latitude}&lng=${position.longitude}`);
    } else {
      navigate('/search');
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-primary/5 to-background py-20 lg:py-32">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">
              Storage Made <span className="text-primary">Simple</span>
            </h1>
            <p className="text-lg lg:text-xl text-muted-foreground mb-8">
              Find secure storage units near you. Book instantly, access 24/7,
              and store with confidence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={handleQuickSearch}
                isLoading={geoLoading}
                className="text-lg px-8"
              >
                <MapPin className="mr-2 h-5 w-5" />
                Find Storage Near Me
              </Button>
              <Link to="/how-it-works">
                <Button variant="outline" size="lg" className="text-lg px-8 w-full sm:w-auto">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose Vaulta?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We make storage simple, secure, and accessible. Here's what sets us
              apart.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Easy Discovery</h3>
                <p className="text-sm text-muted-foreground">
                  Find available storage units near you with our GPS-powered
                  search.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Secure Storage</h3>
                <p className="text-sm text-muted-foreground">
                  All locations feature 24/7 surveillance and secure access
                  controls.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Flexible Booking</h3>
                <p className="text-sm text-muted-foreground">
                  Book by the hour, day, or month. Extend or cancel anytime.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Easy Access</h3>
                <p className="text-sm text-muted-foreground">
                  Access your unit with a QR code. No keys, no hassle.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Locations */}
      <section className="py-20">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Featured Locations</h2>
              <p className="text-muted-foreground">
                Discover our top-rated storage facilities
              </p>
            </div>
            <Link to="/search">
              <Button variant="outline">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredLocations.map((location) => (
                <Link key={location.id} to={`/locations/${location.slug}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-video bg-muted relative">
                      {location.images[0] ? (
                        <img
                          src={location.images[0]}
                          alt={location.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <MapPin className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      {location.isFeatured && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                          Featured
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{location.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {location.city}, {location.country}
                          </p>
                        </div>
                        <div className="flex items-center text-sm">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          <span>{location.rating.toFixed(1)}</span>
                          <span className="text-muted-foreground ml-1">
                            ({location.reviewCount})
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {location.amenities.slice(0, 3).map((amenity) => (
                          <span
                            key={amenity}
                            className="text-xs bg-muted px-2 py-1 rounded"
                          >
                            {amenity.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Store Your Belongings?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers who trust Vaulta for their
            storage needs.
          </p>
          <div className="flex justify-center">
            <Link to="/register">
              <Button
                size="lg"
                variant="secondary"
                className="text-lg px-8"
              >
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
