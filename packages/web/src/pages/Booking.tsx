import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { useBookingStore } from '@/stores/booking.store';
import { useLocationStore } from '@/stores/location.store';
import { api } from '@/services/api';
import { MapPin, Calendar, Clock, Shield, Thermometer, AlertCircle } from 'lucide-react';
import type { StorageUnit, StorageLocation } from '@/types';

const bookingSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endDate: z.string().min(1, 'End date is required'),
  endTime: z.string().min(1, 'End time is required'),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

const sizeLabels: Record<string, string> = {
  SMALL: 'Small',
  MEDIUM: 'Medium',
  LARGE: 'Large',
  XL: 'Extra Large',
};

export function BookingPage() {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const { createBooking, isLoading, error, clearError } = useBookingStore();
  const [unit, setUnit] = useState<StorageUnit | null>(null);
  const [location, setLocation] = useState<StorageLocation | null>(null);
  const [priceEstimate, setPriceEstimate] = useState<{
    basePrice: number;
    adjustments: Array<{ description: string; amount: number }>;
    totalPrice: number;
    duration: { days: number; hours: number };
  } | null>(null);
  const [loadingUnit, setLoadingUnit] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      startDate: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      endTime: '18:00',
    },
  });

  const watchedValues = watch();

  useEffect(() => {
    const fetchUnit = async () => {
      if (!unitId) return;

      try {
        const response = await api.get(`/units/${unitId}`);
        setUnit(response.data.data);

        if (response.data.data.locationId) {
          const locationResponse = await api.get(`/locations/${response.data.data.locationId}`);
          setLocation(locationResponse.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch unit:', err);
      } finally {
        setLoadingUnit(false);
      }
    };

    fetchUnit();
  }, [unitId]);

  useEffect(() => {
    const calculatePrice = async () => {
      if (!unitId || !watchedValues.startDate || !watchedValues.endDate) return;

      const startTime = new Date(`${watchedValues.startDate}T${watchedValues.startTime || '00:00'}`);
      const endTime = new Date(`${watchedValues.endDate}T${watchedValues.endTime || '23:59'}`);

      if (endTime <= startTime) return;

      try {
        const response = await api.post('/bookings/calculate-price', {
          unitId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });
        setPriceEstimate(response.data.data);
      } catch (err) {
        console.error('Failed to calculate price:', err);
      }
    };

    const debounceTimer = setTimeout(calculatePrice, 500);
    return () => clearTimeout(debounceTimer);
  }, [unitId, watchedValues.startDate, watchedValues.startTime, watchedValues.endDate, watchedValues.endTime]);

  const onSubmit = async (data: BookingFormData) => {
    if (!unitId) return;

    try {
      clearError();
      const startTime = new Date(`${data.startDate}T${data.startTime}`);
      const endTime = new Date(`${data.endDate}T${data.endTime}`);

      const booking = await createBooking({
        unitId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        notes: data.notes,
      });

      navigate(`/checkout/${booking.id}`);
    } catch {
      // Error handled by store
    }
  };

  if (loadingUnit) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6 max-w-4xl mx-auto">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-muted rounded-lg" />
            <div className="h-64 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Unit not found</h1>
        <Button onClick={() => navigate('/search')}>Back to Search</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Book Your Storage Unit</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Select Your Dates</CardTitle>
                <CardDescription>
                  Choose when you need to store your items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {error && (
                    <div className="flex items-center gap-2 p-3 text-sm bg-destructive/10 text-destructive rounded-lg">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Start Date/Time */}
                    <div className="space-y-4">
                      <h3 className="font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Start Date & Time
                      </h3>
                      <div className="space-y-2">
                        <label htmlFor="startDate" className="text-sm font-medium">
                          Date
                        </label>
                        <Input
                          id="startDate"
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          error={errors.startDate?.message}
                          {...register('startDate')}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="startTime" className="text-sm font-medium">
                          Time
                        </label>
                        <Input
                          id="startTime"
                          type="time"
                          error={errors.startTime?.message}
                          {...register('startTime')}
                        />
                      </div>
                    </div>

                    {/* End Date/Time */}
                    <div className="space-y-4">
                      <h3 className="font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        End Date & Time
                      </h3>
                      <div className="space-y-2">
                        <label htmlFor="endDate" className="text-sm font-medium">
                          Date
                        </label>
                        <Input
                          id="endDate"
                          type="date"
                          min={watchedValues.startDate || new Date().toISOString().split('T')[0]}
                          error={errors.endDate?.message}
                          {...register('endDate')}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="endTime" className="text-sm font-medium">
                          Time
                        </label>
                        <Input
                          id="endTime"
                          type="time"
                          error={errors.endTime?.message}
                          {...register('endTime')}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label htmlFor="notes" className="text-sm font-medium">
                      Special Instructions (optional)
                    </label>
                    <textarea
                      id="notes"
                      className="w-full min-h-[100px] px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Any special requirements or instructions..."
                      {...register('notes')}
                    />
                  </div>

                  <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                    Continue to Payment
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            {/* Unit Details */}
            <Card>
              <CardHeader>
                <CardTitle>Unit Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">Unit {unit.unitNumber}</div>
                    <div className="text-sm text-muted-foreground">
                      {sizeLabels[unit.size]}
                    </div>
                  </div>
                </div>

                {location && (
                  <div className="text-sm text-muted-foreground">
                    <strong>{location.name}</strong>
                    <br />
                    {location.address}, {location.city}
                  </div>
                )}

                {unit.dimensions && (
                  <div className="text-sm">
                    <strong>Dimensions:</strong>{' '}
                    {unit.dimensions.width}m × {unit.dimensions.height}m × {unit.dimensions.depth}m
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {unit.features?.climateControlled && (
                    <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      <Thermometer className="h-3 w-3" />
                      Climate Controlled
                    </span>
                  )}
                  {unit.features?.secure && (
                    <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      <Shield className="h-3 w-3" />
                      Secure
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Price Estimate */}
            <Card>
              <CardHeader>
                <CardTitle>Price Estimate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {priceEstimate ? (
                  <>
                    <div className="text-sm text-muted-foreground">
                      Duration: {priceEstimate.duration.days} day(s)
                      {priceEstimate.duration.hours > 0 && `, ${priceEstimate.duration.hours} hour(s)`}
                    </div>

                    <div className="space-y-2 border-t pt-4">
                      <div className="flex justify-between text-sm">
                        <span>Base Price</span>
                        <span>${priceEstimate.basePrice.toFixed(2)}</span>
                      </div>
                      {priceEstimate.adjustments.map((adj, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{adj.description}</span>
                          <span className={adj.amount < 0 ? 'text-green-600' : ''}>
                            {adj.amount < 0 ? '-' : '+'}${Math.abs(adj.amount).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between font-bold text-lg border-t pt-4">
                      <span>Total</span>
                      <span>${priceEstimate.totalPrice.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    Select dates to see price estimate
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cancellation Policy */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cancellation Policy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Free cancellation up to 24 hours before check-in. Cancellations within 24 hours
                  may be subject to a cancellation fee.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
