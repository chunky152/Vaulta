import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EditInventoryItemModal } from './EditInventoryItemModal';
import type { InventoryItem } from '@/types';
import { Package, Edit2, Trash2, Tag, Hash } from 'lucide-react';

interface InventoryItemCardProps {
  item: InventoryItem;
  onDelete: () => void;
}

const conditionColors: Record<string, string> = {
  EXCELLENT: 'bg-green-100 text-green-800',
  GOOD: 'bg-blue-100 text-blue-800',
  FAIR: 'bg-yellow-100 text-yellow-800',
  DAMAGED: 'bg-red-100 text-red-800',
};

export function InventoryItemCard({ item, onDelete }: InventoryItemCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium line-clamp-1">{item.name}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Tag className="h-3 w-3" />
                  {item.category}
                </div>
              </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${conditionColors[item.condition]}`}>
              {item.condition}
            </span>
          </div>

          {item.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {item.description}
            </p>
          )}

          <div className="flex items-center justify-between text-sm mb-4">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Hash className="h-3 w-3" />
              Qty: {item.quantity}
            </div>
            {item.estimatedValue && (
              <div className="font-medium">
                ${item.estimatedValue.toLocaleString()}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Edit2 className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <EditInventoryItemModal
        item={item}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </>
  );
}
