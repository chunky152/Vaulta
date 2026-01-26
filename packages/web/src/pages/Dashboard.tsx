import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/auth.store';
import { useBookingStore } from '@/stores/booking.store';
import { useInventoryStore } from '@/stores/inventory.store';
import {
  MapPin,
  Calendar,
  Clock,
  Package,
  Star,
  ArrowRight,
  QrCode,
  AlertCircle,
  Boxes,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending Payment',
  CONFIRMED: 'Confirmed',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { bookings, fetchUserBookings, isLoading } = useBookingStore();
  const { summary, fetchSummary } = useInventoryStore();

  useEffect(() => {
    fetchUserBookings();
    fetchSummary();
  }, [fetchUserBookings, fetchSummary]);

  const activeBookings = bookings.filter(
    (b) => b.status === 'ACTIVE' || b.status === 'CONFIRMED'
  );
  const pendingBookings = bookings.filter((b) => b.status === 'PENDING');
  const recentBookings = bookings.slice(0, 5);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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
      <div className="container mx-auto px-4">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.firstName || user?.email?.split('@')[0] || 'User'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your storage bookings and access your units
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Bookings</p>
                  <p className="text-2xl font-bold">{activeBookings.length}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{pendingBookings.length}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Bookings</p>
                  <p className="text-2xl font-bold">{bookings.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/inventory')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Inventory Items</p>
                  <p className="text-2xl font-bold">{summary?.totalItems || 0}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Boxes className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Loyalty Points</p>
                  <p className="text-2xl font-bold">{user?.loyaltyPoints || 0}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Star className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pending Payments Alert */}
            {pendingBookings.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-medium text-yellow-800">
                        You have {pendingBookings.length} pending booking(s)
                      </h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        Complete payment to confirm your reservations.
                      </p>
                      <div className="mt-4 flex gap-2">
                        {pendingBookings.slice(0, 2).map((booking) => (
                          <Button
                            key={booking.id}
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/checkout/${booking.id}`)}
                          >
                            Pay {booking.bookingNumber}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Active Bookings */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Active Bookings</CardTitle>
                <Link to="/bookings" className="text-sm text-primary hover:underline">
                  View All
                </Link>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-24 bg-muted rounded-lg" />
                    ))}
                  </div>
                ) : activeBookings.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No active bookings</p>
                    <Button onClick={() => navigate('/search')}>
                      Find Storage
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/bookings`)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <MapPin className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">
                              Booking {booking.bookingNumber}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(booking.startTime)} - {formatDate(booking.endTime)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-xs px-2 py-1 rounded ${statusColors[booking.status]}`}>
                            {statusLabels[booking.status]}
                          </span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {recentBookings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No booking history yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between py-3 border-b last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${
                            booking.status === 'ACTIVE' ? 'bg-green-500' :
                            booking.status === 'CONFIRMED' ? 'bg-blue-500' :
                            booking.status === 'COMPLETED' ? 'bg-gray-400' :
                            booking.status === 'PENDING' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`} />
                          <div>
                            <div className="text-sm font-medium">
                              {booking.bookingNumber}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(booking.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            ${booking.totalPrice.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {statusLabels[booking.status]}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/search')}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Find Storage Near Me
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/bookings')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  View All Bookings
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/inventory')}
                >
                  <Boxes className="h-4 w-4 mr-2" />
                  My Inventory
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/profile')}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Manage Profile
                </Button>
              </CardContent>
            </Card>

            {/* Access Codes */}
            {activeBookings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    Access Codes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activeBookings.slice(0, 3).map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <div className="text-sm font-medium">{booking.bookingNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          Valid until {formatDate(booking.endTime)}
                        </div>
                      </div>
                      <div className="font-mono text-lg font-bold">
                        {booking.accessCode}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Referral Card */}
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="pt-6">
                <h3 className="font-bold mb-2">Refer a Friend</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Share your referral code and earn points when friends sign up!
                </p>
                <div className="flex items-center gap-2 bg-background rounded-lg p-3">
                  <code className="flex-1 font-mono text-sm">
                    {user?.referralCode || 'Loading...'}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (user?.referralCode) {
                        navigator.clipboard.writeText(user.referralCode);
                      }
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
