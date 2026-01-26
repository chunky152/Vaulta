import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useInventoryStore } from '@/stores/inventory.store';
import { useBookingStore } from '@/stores/booking.store';
import { AddInventoryItemModal } from '@/components/inventory/AddInventoryItemModal';
import { InventoryItemCard } from '@/components/inventory/InventoryItemCard';
import { ITEM_CATEGORIES } from '@/types';
import {
  Package,
  Plus,
  Search,
  Filter,
  DollarSign,
  LayoutGrid,
  ArrowLeft,
} from 'lucide-react';

export function InventoryPage() {
  const {
    items,
    summary,
    isLoading,
    error,
    pagination,
    fetchAllInventory,
    fetchSummary,
    deleteItem,
  } = useInventoryStore();

  const { bookings, fetchUserBookings } = useBookingStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');

  // Get active/confirmed bookings for adding items
  const activeBookings = bookings.filter(
    (b) => b.status === 'ACTIVE' || b.status === 'CONFIRMED'
  );

  useEffect(() => {
    fetchAllInventory();
    fetchSummary();
    fetchUserBookings();
  }, [fetchAllInventory, fetchSummary, fetchUserBookings]);

  useEffect(() => {
    const params: { category?: string; search?: string } = {};
    if (selectedCategory) params.category = selectedCategory;
    if (searchQuery) params.search = searchQuery;
    fetchAllInventory(params);
  }, [selectedCategory, searchQuery, fetchAllInventory]);

  const handleDeleteItem = async (itemId: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteItem(itemId);
      } catch (error) {
        console.error('Failed to delete item:', error);
      }
    }
  };

  const handleAddClick = () => {
    if (activeBookings.length === 1) {
      setSelectedBookingId(activeBookings[0].id);
      setIsAddModalOpen(true);
    } else if (activeBookings.length > 1) {
      // Show booking selector
      setSelectedBookingId('');
      setIsAddModalOpen(true);
    }
  };

  // Group items by booking
  const itemsByBooking = items.reduce((acc, item) => {
    const key = item.bookingId;
    if (!acc[key]) {
      acc[key] = {
        booking: item.booking,
        items: [],
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {} as Record<string, { booking: typeof items[0]['booking']; items: typeof items }>);

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                to="/dashboard"
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-3xl font-bold">My Inventory</h1>
            </div>
            <p className="text-muted-foreground">
              Track and manage items stored in your units
            </p>
          </div>
          {activeBookings.length > 0 && (
            <Button onClick={handleAddClick}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Items</p>
                    <p className="text-2xl font-bold">{summary.totalItems}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Estimated Value
                    </p>
                    <p className="text-2xl font-bold">
                      ${summary.totalEstimatedValue.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Categories</p>
                    <p className="text-2xl font-bold">
                      {summary.categoryBreakdown.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <LayoutGrid className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">All Categories</option>
                  {ITEM_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-destructive">{error}</p>
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="text-center">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No items yet</h3>
                <p className="text-muted-foreground mb-6">
                  {activeBookings.length > 0
                    ? 'Start tracking items stored in your units'
                    : 'You need an active booking to add inventory items'}
                </p>
                {activeBookings.length > 0 ? (
                  <Button onClick={handleAddClick}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Item
                  </Button>
                ) : (
                  <Link to="/search">
                    <Button>Find Storage</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(itemsByBooking).map(([bookingId, { booking, items }]) => (
              <div key={bookingId}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {booking?.unit?.location?.name || 'Storage Unit'} -{' '}
                      {booking?.unit?.unitNumber}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Booking: {booking?.bookingNumber}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      booking?.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : booking?.status === 'CONFIRMED'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {booking?.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item) => (
                    <InventoryItemCard
                      key={item.id}
                      item={item}
                      onDelete={() => handleDeleteItem(item.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination info */}
        {pagination.total > 0 && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Showing {items.length} of {pagination.total} items
          </div>
        )}

        {/* Add Item Modal */}
        <AddInventoryItemModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setSelectedBookingId('');
          }}
          bookings={activeBookings}
          preselectedBookingId={selectedBookingId}
        />
      </div>
    </div>
  );
}
