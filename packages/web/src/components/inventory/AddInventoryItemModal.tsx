import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useInventoryStore } from '@/stores/inventory.store';
import type { Booking, CreateInventoryItemInput, ItemCondition } from '@/types';
import { ITEM_CATEGORIES } from '@/types';
import { X, Package } from 'lucide-react';

interface AddInventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: Booking[];
  preselectedBookingId?: string;
}

const CONDITIONS: { value: ItemCondition; label: string }[] = [
  { value: 'EXCELLENT', label: 'Excellent' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'DAMAGED', label: 'Damaged' },
];

export function AddInventoryItemModal({
  isOpen,
  onClose,
  bookings,
  preselectedBookingId,
}: AddInventoryItemModalProps) {
  const { addItem, isLoading } = useInventoryStore();

  const [selectedBookingId, setSelectedBookingId] = useState(
    preselectedBookingId || ''
  );
  const [formData, setFormData] = useState<CreateInventoryItemInput>({
    name: '',
    description: '',
    category: '',
    quantity: 1,
    condition: 'GOOD',
    estimatedValue: undefined,
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const newErrors: Record<string, string> = {};
    if (!selectedBookingId) newErrors.booking = 'Please select a booking';
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.category) newErrors.category = 'Category is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await addItem(selectedBookingId, formData);
      handleClose();
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      quantity: 1,
      condition: 'GOOD',
      estimatedValue: undefined,
      notes: '',
    });
    setSelectedBookingId(preselectedBookingId || '');
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />
      <Card className="relative w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Add Inventory Item
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Booking Selector (if multiple bookings) */}
            {bookings.length > 1 && (
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Select Booking
                </label>
                <select
                  value={selectedBookingId}
                  onChange={(e) => setSelectedBookingId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Select a booking...</option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bookingNumber} - {b.unit?.location?.name || 'Unit'}{' '}
                      {b.unit?.unitNumber}
                    </option>
                  ))}
                </select>
                {errors.booking && (
                  <p className="mt-1 text-sm text-destructive">{errors.booking}</p>
                )}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Item Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Winter Clothes Box"
                error={errors.name}
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Select category...</option>
                {ITEM_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-destructive">{errors.category}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of the item..."
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm min-h-[80px]"
              />
            </div>

            {/* Quantity and Condition */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Quantity
                </label>
                <Input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Condition
                </label>
                <select
                  value={formData.condition}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      condition: e.target.value as ItemCondition,
                    })
                  }
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Estimated Value */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Estimated Value ($)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.estimatedValue || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    estimatedValue: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
                placeholder="Optional"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Any additional notes..."
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm min-h-[60px]"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add Item'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
