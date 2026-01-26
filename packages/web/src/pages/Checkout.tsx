import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { api } from '@/services/api';
import { MapPin, Calendar, Clock, CreditCard, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import type { Booking, StorageUnit, StorageLocation } from '@/types';

export function CheckoutPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [unit, setUnit] = useState<StorageUnit | null>(null);
  const [location, setLocation] = useState<StorageLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) return;

      try {
        const response = await api.get(`/bookings/${bookingId}`);
        const bookingData = response.data.data;
        setBooking(bookingData);

        // Fetch unit details
        const unitResponse = await api.get(`/units/${bookingData.unitId}`);
        setUnit(unitResponse.data.data);

        // Fetch location details
        if (unitResponse.data.data.locationId) {
          const locationResponse = await api.get(`/locations/${unitResponse.data.data.locationId}`);
          setLocation(locationResponse.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch booking:', err);
        setError('Failed to load booking details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  const handlePayment = async () => {
    if (!booking) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Create payment intent
      const intentResponse = await api.post('/payments/create-intent', {
        bookingId: booking.id,
      });

      // In a real app, you would use Stripe Elements here
      // For demo, we'll simulate a successful payment
      const { clientSecret } = intentResponse.data.data;

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Confirm the booking
      await api.post(`/bookings/${booking.id}/confirm`);

      setPaymentSuccess(true);

      // Redirect to dashboard after a delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6 max-w-2xl mx-auto">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center py-8">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
              <p className="text-muted-foreground">
                Your booking has been confirmed. You will receive a confirmation email shortly.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-left">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking Number</span>
                  <span className="font-mono font-medium">{booking?.bookingNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Access Code</span>
                  <span className="font-mono font-medium">{booking?.accessCode}</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!booking || !unit) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Booking not found</h1>
        <Button onClick={() => navigate('/search')}>Back to Search</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Complete Your Booking</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Details
                </CardTitle>
                <CardDescription>
                  Complete your booking with a secure payment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {error && (
                  <div className="flex items-center gap-2 p-3 text-sm bg-destructive/10 text-destructive rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                {/* Demo Payment Form */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-4">
                    This is a demo checkout. In production, Stripe Elements would be integrated here.
                  </p>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Card Number</label>
                      <div className="px-3 py-2 border border-input rounded-md bg-background text-sm text-muted-foreground">
                        4242 4242 4242 4242
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Expiry</label>
                        <div className="px-3 py-2 border border-input rounded-md bg-background text-sm text-muted-foreground">
                          12/25
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">CVC</label>
                        <div className="px-3 py-2 border border-input rounded-md bg-background text-sm text-muted-foreground">
                          123
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>Your payment is secured with SSL encryption</span>
                </div>

                <Button
                  onClick={handlePayment}
                  className="w-full"
                  size="lg"
                  isLoading={isProcessing}
                >
                  Pay ${booking.totalPrice.toFixed(2)}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By completing this payment, you agree to our Terms of Service and Privacy Policy.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Location */}
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="font-medium">{location?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Unit {unit.unitNumber}
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="font-medium">Check-in</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(booking.startTime)} at {formatTime(booking.startTime)}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="font-medium">Check-out</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(booking.endTime)} at {formatTime(booking.endTime)}
                    </div>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Booking Number</span>
                    <span className="font-mono">{booking.bookingNumber}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>${booking.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
