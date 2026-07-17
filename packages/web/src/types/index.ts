// Wire-level types shared with the backend live in @unbur/shared;
// re-exported here so pages keep a single import location.
export type {
  ApiResponse,
  PaginatedResponse,
  AuthTokens,
  UserRole,
  UnitSize,
  UnitStatus,
  BookingStatus,
  ItemCondition,
  PriceAdjustment,
} from '@unbur/shared';

import type {
  UserRole,
  UnitSize,
  UnitStatus,
  BookingStatus,
  ItemCondition,
} from '@unbur/shared';

// User types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: UserRole;
  emailVerified: boolean;
  phoneVerified: boolean;
  profileImageUrl?: string;
  referralCode: string;
  loyaltyPoints: number;
  createdAt: string;
}

// Location types
export interface Location {
  id: string;
  name: string;
  slug: string;
  description?: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  latitude: number;
  longitude: number;
  contactPhone?: string;
  contactEmail?: string;
  operatingHours: Record<string, { open?: string; close?: string; closed?: boolean }>;
  images: string[];
  amenities: string[];
  rating: number;
  reviewCount: number;
  isActive: boolean;
  isFeatured: boolean;
}

// Alias matching the backend's model name
export type StorageLocation = Location;

export interface LocationWithDistance extends Location {
  distance: number;
  availableUnits?: number;
  totalUnits?: number;
}

// Unit types
export interface StorageUnit {
  id: string;
  locationId: string;
  unitNumber: string;
  name?: string;
  size: UnitSize;
  dimensions: { width: number; height: number; depth: number };
  basePriceHourly: number;
  basePriceDaily: number;
  basePriceMonthly?: number;
  currency: string;
  status: UnitStatus;
  features: string[];
  floor?: number;
  location?: Location;
}

export interface UnitAvailability {
  available: boolean;
  conflicts: { bookingId: string; startTime: string; endTime: string }[];
}

// Booking types
export interface Booking {
  id: string;
  bookingNumber: string;
  userId: string;
  unitId: string;
  status: BookingStatus;
  startTime: string;
  endTime: string;
  checkInTime?: string;
  checkOutTime?: string;
  totalPrice: number;
  currency: string;
  accessCode?: string;
  notes?: string;
  unit?: StorageUnit;
  user?: User;
  createdAt: string;
}

// Pricing types
export type { BookingPriceCalculation as PriceCalculation } from '@unbur/shared';

// Notification types
export interface Notification {
  id: string;
  type: 'EMAIL' | 'SMS' | 'PUSH';
  category: 'BOOKING' | 'PAYMENT' | 'REMINDER' | 'PROMO' | 'SYSTEM';
  title: string;
  message: string;
  data: Record<string, unknown>;
  sentAt?: string;
  readAt?: string;
  createdAt: string;
}

// Transaction types
export interface Transaction {
  id: string;
  bookingId?: string;
  amount: number;
  currency: string;
  type: 'PAYMENT' | 'REFUND' | 'DEPOSIT';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  createdAt: string;
  booking?: { bookingNumber: string };
}

// Search params
export interface NearbySearchParams {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  page?: number;
  limit?: number;
}

export interface BookingSearchParams {
  status?: BookingStatus;
  page?: number;
  limit?: number;
}

// Inventory types
export const ITEM_CATEGORIES = [
  'Electronics',
  'Furniture',
  'Documents',
  'Clothing',
  'Sports Equipment',
  'Tools',
  'Household Items',
  'Collectibles',
  'Other',
] as const;

export type ItemCategory = typeof ITEM_CATEGORIES[number];

export interface InventoryItem {
  id: string;
  bookingId: string;
  userId: string;
  name: string;
  description?: string;
  category: string;
  quantity: number;
  condition: ItemCondition;
  estimatedValue?: number;
  photos: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  booking?: {
    bookingNumber: string;
    status: BookingStatus;
    unit?: {
      unitNumber: string;
      location?: {
        name: string;
      };
    };
  };
}

export interface InventorySummary {
  totalItems: number;
  totalEstimatedValue: number;
  categoryBreakdown: { category: string; count: number }[];
}

export interface CreateInventoryItemInput {
  name: string;
  description?: string;
  category: string;
  quantity?: number;
  condition?: ItemCondition;
  estimatedValue?: number;
  photos?: string[];
  notes?: string;
}

export interface UpdateInventoryItemInput {
  name?: string;
  description?: string;
  category?: string;
  quantity?: number;
  condition?: ItemCondition;
  estimatedValue?: number | null;
  photos?: string[];
  notes?: string;
}

export interface InventorySearchParams {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}
