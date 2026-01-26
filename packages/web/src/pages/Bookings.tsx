import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useBookingStore } from '@/stores/booking.store';
import { api } from '@/services/api';
import {
  MapPin,
  Calendar,
  Clock,
  QrCode,
  ChevronRight,
  Filter,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import type { Booking, StorageUnit, StorageLocation } from '@/types';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-200',
  ACTIVE: 'bg-green-100 text-green-800 border-green-200',
  COMPLETED: 'bg-gray-100 text-gray-800 border-gray-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending Payment',
  CONFIRMED: 'Confirmed',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

type FilterStatus = 'ALL' | 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export function BookingsPage() {
  const navigate = useNavigate();
  const { bookings, fetchUserBookings, isLoading } = useBookingStore();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);
  const [bookingDetails, setBookingDetails] = useState<Record<string, { unit?: StorageUnit; location?: StorageLocation }>>({});

  useEffect(() => {
    fetchUserBookings();
  }, [fetchUserBookings]);

  const fetchBookingDetails = async (booking: Booking) => {
    if (bookingDetails[booking.id]) return;

    try {
      const unitResponse = await api.get(`/units/${booking.unitId}`);
      const unit = unitResponse.data.data;

      let location;
      if (unit.locationId) {
        const locationResponse = await api.get(`/locations/${unit.locationId}`);
        location = locationResponse.data.data;
      }

      setBookingDetails((prev) => ({
        ...prev,
        [booking.id]: { unit, location },
      }));
    } catch (err) {
      console.error('Failed to fetch booking details:', err);
    }
  };

  const handleExpand = (booking: Booking) => {
    if (expandedBooking === booking.id) {
      setExpandedBooking(null);
    } else {
      setExpandedBooking(booking.id);
      fetchBookingDetails(booking);
    }
  };

  const filteredBookings = filterStatus === 'ALL'
    ? bookings
    : bookings.filter((b) => b.status === filterStatus);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Bookings</h1>
            <p className="text-muted-foreground mt-1">
              View and manage all your storage bookings
            </p>
          </div>
          <Button onClick={() => navigate('/search')}>
            <MapPin className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={filterStatus === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('ALL')}
          >
            All ({bookings.length})
          </Button>
          {(['ACTIVE', 'CONFIRMED', 'PENDING', 'COMPLETED', 'CANCELLED'] as FilterStatus[]).map((status) => {
            const count = bookings.filter((b) => b.status === status).length;
            if (count === 0) return null;
            return (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(status)}
              >
                {statusLabels[status]} ({count})
              </Button>
            );
          })}
        </div>

        {/* Bookings List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-24 bg-muted rounded-lg" />
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No bookings found</h3>
              <p className="text-muted-foreground mb-6">
                {filterStatus === 'ALL'
                  ? "You haven't made any bookings yet."
                  : `No ${statusLabels[filterStatus].toLowerCase()} bookings.`}
              </p>
              <Button onClick={() => navigate('/search')}>
                Find Storage
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <Card key={booking.id} className="overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleExpand(booking)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        booking.status === 'ACTIVE' ? 'bg-green-100' :
                        booking.status === 'CONFIRMED' ? 'bg-blue-100' :
                        booking.status === 'PENDING' ? 'bg-yellow-100' :
                        'bg-gray-100'
                      }`}>
                        {booking.status === 'ACTIVE' ? (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : booking.status === 'PENDING' ? (
                          <AlertCircle className="h-6 w-6 text-yellow-600" />
                        ) : (
                          <Calendar className="h-6 w-6 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{booking.bookingNumber}</span>
                          <span className={`text-xs px-2 py-0.5 rounded border ${statusColors[booking.status]}`}>
                            {statusLabels[booking.status]}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {formatDate(booking.startTime)} - {formatDate(booking.endTime)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold">${booking.totalPrice.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">
                          {booking.currency}
                        </div>
                      </div>
                      <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${
                        expandedBooking === booking.id ? 'rotate-90' : ''
                      }`} />
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedBooking === booking.id && (
                  <div className="border-t bg-muted/30 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">Location</h4>
                          {bookingDetails[booking.id]?.location ? (
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                              <div>
                                <div className="font-medium">
                                  {bookingDetails[booking.id].location?.name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {bookingDetails[booking.id].location?.address}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="animate-pulse h-12 bg-muted rounded" />
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">Unit</h4>
                          {bookingDetails[booking.id]?.unit ? (
                            <div className="text-sm">
                              Unit {bookingDetails[booking.id].unit?.unitNumber} (
                              {bookingDetails[booking.id].unit?.size})
                            </div>
                          ) : (
                            <div className="animate-pulse h-6 bg-muted rounded w-24" />
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">Duration</h4>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>Check-in: {formatTime(booking.startTime)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>Check-out: {formatTime(booking.endTime)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-4">
                        {(booking.status === 'ACTIVE' || booking.status === 'CONFIRMED') && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Access Code</h4>
                            <div className="flex items-center gap-3 bg-background p-3 rounded-lg border">
                              <QrCode className="h-8 w-8 text-primary" />
                              <div>
                                <div className="font-mono text-xl font-bold">
                                  {booking.accessCode}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Show this code at the facility
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {booking.notes && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Notes</h4>
                            <p className="text-sm">{booking.notes}</p>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          {booking.status === 'PENDING' && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/checkout/${booking.id}`);
                              }}
                            >
                              Complete Payment
                            </Button>
                          )}
                          {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle cancellation
                              }}
                            >
                              Cancel Booking
                            </Button>
                          )}
                          {booking.status === 'ACTIVE' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle extension
                              }}
                            >
                              Extend Booking
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
