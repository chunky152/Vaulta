import { InventoryItemForm } from '@/features/inventory/InventoryItemForm';
import type { Booking } from '@/types';

interface AddInventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: Booking[];
  preselectedBookingId?: string;
}

export function AddInventoryItemModal(props: AddInventoryItemModalProps) {
  return <InventoryItemForm mode="create" {...props} />;
}
