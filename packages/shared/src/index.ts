// Wire-level types and constants shared between @unbur/backend and
// @unbur/web. Everything here describes what travels over the API, so
// dates are not included in entity shapes (the backend sees Date, the
// client sees ISO strings) — each app keeps its own entity interfaces.

// ============================================
// Domain constants
// ============================================
// Const objects (not TS enums) so the backend can use them as values
// (Mongoose enum lists, Zod nativeEnum, defaults) while the web treats
// the derived types as plain string-literal unions.

export const UserRole = {
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UnitSize = {
  SMALL: 'SMALL',
  MEDIUM: 'MEDIUM',
  LARGE: 'LARGE',
  XL: 'XL',
} as const;
export type UnitSize = (typeof UnitSize)[keyof typeof UnitSize];

export const UnitStatus = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  MAINTENANCE: 'MAINTENANCE',
  RESERVED: 'RESERVED',
} as const;
export type UnitStatus = (typeof UnitStatus)[keyof typeof UnitStatus];

export const BookingStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const ItemCondition = {
  EXCELLENT: 'EXCELLENT',
  GOOD: 'GOOD',
  FAIR: 'FAIR',
  DAMAGED: 'DAMAGED',
} as const;
export type ItemCondition = (typeof ItemCondition)[keyof typeof ItemCondition];

// ============================================
// API envelope
// ============================================

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

// ============================================
// Auth
// ============================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ============================================
// Pricing
// ============================================

export interface PriceAdjustment {
  name: string;
  type: 'discount' | 'surcharge';
  amount: number;
  percentage?: number;
}

export interface BookingPriceCalculation {
  basePrice: number;
  duration: number; // in hours
  durationType: 'hourly' | 'daily' | 'monthly';
  adjustments: PriceAdjustment[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
}
