import { InventoryItemForm } from '@/features/inventory/InventoryItemForm';
import type { InventoryItem } from '@/types';

interface EditInventoryItemModalProps {
  item: InventoryItem;
  isOpen: boolean;
  onClose: () => void;
}

export function EditInventoryItemModal(props: EditInventoryItemModalProps) {
  return <InventoryItemForm mode="edit" {...props} />;
}
