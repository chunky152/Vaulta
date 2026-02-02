import { Request } from 'express';
import { UserRole } from '../models/User.js';

// ============================================
// Express Extended Types
// ============================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

// ============================================
// API Response Types
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
// Query Parameter Types
// ============================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GeoSearchParams extends PaginationParams {
  latitude: number;
  longitude: number;
  radiusKm?: number;
}

export interface UnitSearchParams extends PaginationParams {
  locationId?: string;
  size?: string;
  minPrice?: number;
  maxPrice?: number;
  features?: string[];
  startTime?: Date;
  endTime?: Date;
}

export interface BookingSearchParams extends PaginationParams {
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

// ============================================
// Auth Types
// ============================================

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  referralCode?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// ============================================
// Location Types
// ============================================

export interface LocationWithDistance {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string;
  city: string;
  state: string | null;
  country: string;
  latitude: number;
  longitude: number;
  distance: number; // in kilometers
  operatingHours: Record<string, unknown>;
  images: string[];
  amenities: string[];
  rating: number;
  reviewCount: number;
  availableUnits?: number;
}

export interface CreateLocationInput {
  name: string;
  description?: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  operatingHours?: Record<string, unknown>;
  contactPhone?: string;
  contactEmail?: string;
  images?: string[];
  amenities?: string[];
}

// ============================================
// Unit Types
// ============================================

export interface CreateUnitInput {
  locationId: string;
  unitNumber: string;
  name?: string;
  size: 'SMALL' | 'MEDIUM' | 'LARGE' | 'XL';
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  basePriceHourly: number;
  basePriceDaily: number;
  basePriceMonthly?: number;
  currency?: string;
  features?: string[];
  floor?: number;
}

export interface UnitAvailability {
  unitId: string;
  available: boolean;
  nextAvailableTime?: Date;
  currentBookingEnds?: Date;
}

// ============================================
// Booking Types
// ============================================

export interface CreateBookingInput {
  unitId: string;
  startTime: Date;
  endTime: Date;
  notes?: string;
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

export interface PriceAdjustment {
  name: string;
  type: 'discount' | 'surcharge';
  amount: number;
  percentage?: number;
}

// ============================================
// Payment Types
// ============================================

export interface CreatePaymentIntentInput {
  bookingId: string;
  amount: number;
  currency: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

// ============================================
// Notification Types
// ============================================

export interface SendNotificationInput {
  userId: string;
  type: 'EMAIL' | 'SMS' | 'PUSH';
  category: 'BOOKING' | 'PAYMENT' | 'REMINDER' | 'PROMO' | 'SYSTEM';
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface EmailTemplateData {
  recipientName: string;
  recipientEmail: string;
  subject: string;
  templateId?: string;
  dynamicData: Record<string, unknown>;
}

// ============================================
// Analytics Types
// ============================================

export interface DashboardStats {
  totalUsers: number;
  totalBookings: number;
  activeBookings: number;
  totalRevenue: number;
  occupancyRate: number;
  averageBookingDuration: number;
  newUsersThisMonth: number;
  revenueThisMonth: number;
}

export interface OccupancyData {
  locationId: string;
  locationName: string;
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
}

// ============================================
// Error Types
// ============================================

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errors?: Record<string, string[]>;

  constructor(
    message: string,
    statusCode: number = 500,
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, errors?: Record<string, string[]>) {
    super(message, 400, errors);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Permission denied') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}
