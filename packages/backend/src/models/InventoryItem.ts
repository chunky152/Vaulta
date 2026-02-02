import { Schema, model, Document } from 'mongoose';

export enum ItemCondition {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  DAMAGED = 'DAMAGED',
}

interface IInventoryItem extends Document {
  bookingId: string;
  userId: string;
  name: string;
  description?: string;
  category: string;
  quantity: number;
  condition: ItemCondition;
  estimatedValue?: number;
  photos?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryItemSchema = new Schema<IInventoryItem>(
  {
    bookingId: { type: 'objectId', required: true },
    userId: { type: 'objectId', required: true },
    name: { type: String, required: true },
    description: String,
    category: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    condition: { type: String, enum: Object.values(ItemCondition), default: ItemCondition.GOOD },
    estimatedValue: Number,
    photos: [String],
    notes: String,
  },
  { timestamps: true }
);

inventoryItemSchema.index({ bookingId: 1 });
inventoryItemSchema.index({ userId: 1 });
inventoryItemSchema.index({ category: 1 });

export const InventoryItem = model<IInventoryItem>('InventoryItem', inventoryItemSchema);
