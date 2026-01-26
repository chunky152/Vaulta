// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// User types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';
  emailVerified: boolean;
  phoneVerified: boolean;
  profileImageUrl?: string;
  referralCode: string;
  loyaltyPoints: number;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
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
  operatingHours: Record<string, { open?: string; close?: string; closed?: boolean }>;
  images: string[];
  amenities: string[];
  rating: number;
  reviewCount: number;
  isActive: boolean;
  isFeatured: boolean;
}

export interface LocationWithDistance extends Location {
  distance: number;
  availableUnits?: number;
  totalUnits?: number;
}

// Unit types
export type UnitSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'XL';
export type UnitStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED';

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
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

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
export interface PriceCalculation {
  basePrice: number;
  duration: number;
  durationType: 'hourly' | 'daily' | 'monthly';
  adjustments: PriceAdjustment[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
}

export interface PriceAdjustment {
  name: string;
  type: 'discount' | 'surcharge';
  amount: number;
  percentage?: number;
}

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
export type ItemCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED';

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
