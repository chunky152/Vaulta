import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Generate a unique booking number
export function generateBookingNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `AV-${timestamp}-${random}`;
}

// Generate a unique referral code
export function generateReferralCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Generate access code for storage units
export function generateAccessCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// Generate a slug from a string
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Format currency
export function formatCurrency(
  amount: number,
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

// Calculate duration between two dates
export function calculateDuration(
  startTime: Date,
  endTime: Date
): { hours: number; days: number; months: number } {
  const diffMs = endTime.getTime() - startTime.getTime();
  const hours = Math.ceil(diffMs / (1000 * 60 * 60));
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const months = Math.ceil(days / 30);

  return { hours, days, months };
}

// Determine pricing type based on duration
export function determinePricingType(
  hours: number
): 'hourly' | 'daily' | 'monthly' {
  if (hours <= 24) {
    return 'hourly';
  } else if (hours <= 720) {
    // ~30 days
    return 'daily';
  } else {
    return 'monthly';
  }
}

// Paginate array
export function paginate<T>(
  array: T[],
  page: number,
  limit: number
): { data: T[]; total: number; totalPages: number } {
  const offset = (page - 1) * limit;
  const data = array.slice(offset, offset + limit);
  const total = array.length;
  const totalPages = Math.ceil(total / limit);

  return { data, total, totalPages };
}

// Sanitize user object for response (remove sensitive fields)
export function sanitizeUser<T extends Record<string, unknown>>(
  user: T
): Omit<T, 'passwordHash'> {
  const { passwordHash, ...sanitized } = user as T & { passwordHash?: string };
  return sanitized as Omit<T, 'passwordHash'>;
}

// Parse boolean from string
export function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  return value.toLowerCase() === 'true';
}

// Parse date from string
export function parseDate(value: string | undefined): Date | undefined {
  if (value === undefined) return undefined;
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
}

// Generate UUID
export function generateUUID(): string {
  return uuidv4();
}

// Check if UUID is valid
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Delay execution (useful for testing)
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Omit keys from object
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
}

// Pick keys from object
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}
