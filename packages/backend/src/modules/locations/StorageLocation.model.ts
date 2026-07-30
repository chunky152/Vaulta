import { Schema, model, Document } from 'mongoose';

interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

interface IStorageLocation extends Document {
  name: string;
  slug: string;
  description?: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  location: GeoPoint;
  operatingHours?: Record<string, unknown>;
  contactPhone?: string;
  contactEmail?: string;
  images?: string[];
  amenities?: string[];
  isActive: boolean;
  isFeatured: boolean;
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const storageLocationSchema = new Schema<IStorageLocation>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: String,
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: String,
    country: { type: String, required: true },
    postalCode: String,
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    location: {
      type: { type: String, enum: ['Point'], required: true },
      coordinates: { type: [Number], required: true },
    },
    operatingHours: Schema.Types.Mixed,
    contactPhone: String,
    contactEmail: String,
    images: [String],
    amenities: [String],
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

storageLocationSchema.index({ city: 1 });
storageLocationSchema.index({ isActive: 1 });
storageLocationSchema.index({ location: '2dsphere' });

export const StorageLocation = model<IStorageLocation>('StorageLocation', storageLocationSchema);
