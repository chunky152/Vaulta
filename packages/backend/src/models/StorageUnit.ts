import { Schema, model, Document, Types } from 'mongoose';

export enum UnitSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  XL = 'XL',
}

export enum UnitStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  MAINTENANCE = 'MAINTENANCE',
  RESERVED = 'RESERVED',
}

interface IStorageUnit extends Document {
  locationId: Types.ObjectId;
  unitNumber: string;
  name?: string;
  size: UnitSize;
  dimensions?: Record<string, number>;
  basePriceHourly: number;
  basePriceDaily: number;
  basePriceMonthly?: number;
  currency: string;
  status: UnitStatus;
  features?: string[];
  qrCode?: string;
  floor?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const storageUnitSchema = new Schema<IStorageUnit>(
  {
    locationId: { type: Schema.Types.ObjectId, required: true },
    unitNumber: { type: String, required: true },
    name: String,
    size: { type: String, enum: Object.values(UnitSize), required: true },
    dimensions: Schema.Types.Mixed,
    basePriceHourly: { type: Number, required: true },
    basePriceDaily: { type: Number, required: true },
    basePriceMonthly: Number,
    currency: { type: String, default: 'USD' },
    status: { type: String, enum: Object.values(UnitStatus), default: UnitStatus.AVAILABLE },
    features: [String],
    qrCode: { type: String, unique: true, sparse: true },
    floor: Number,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

storageUnitSchema.index({ locationId: 1 });
storageUnitSchema.index({ status: 1 });
storageUnitSchema.index({ size: 1 });
storageUnitSchema.index({ locationId: 1, unitNumber: 1 }, { unique: true });

export const StorageUnit = model<IStorageUnit>('StorageUnit', storageUnitSchema);
