import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useLocationStore } from '@/stores/location.store';
import { useGeolocation } from '@/hooks/useGeolocation';
import { LocationMap } from '@/components/map/LocationMap';
import {
  MapPin,
  Search,
  Shield,
  Clock,
  Smartphone,
  ArrowRight,
} from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();
  const { position, isLoading: geoLoading } = useGeolocation();
  const { setUserPosition } = useLocationStore();

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
            <h2 className="text-3xl font-bold mb-4">Why Choose Unbur?</h2>
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

      {/* Map Section */}
      <section className="py-20">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Explore the Map</h2>
              <p className="text-muted-foreground">
                Browse the map to find storage near you
              </p>
            </div>
            <Link to="/search">
              <Button variant="outline">
                View List
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="h-[60vh] rounded overflow-hidden">
            <LocationMap
              locations={[]}
              userPosition={
                position
                  ? { latitude: position.latitude, longitude: position.longitude }
                  : null
              }
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Store Your Belongings?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers who trust Unbur for their
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
