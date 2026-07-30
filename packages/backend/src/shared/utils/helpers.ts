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

// Sanitize user object for response (remove sensitive fields)
export function sanitizeUser<T extends object>(
  user: T
): Omit<T, 'passwordHash'> {
  const { passwordHash, ...sanitized } = user as T & { passwordHash?: string };
  return sanitized as Omit<T, 'passwordHash'>;
}

// Build the pagination metadata block used in PaginatedResponse
export function buildPagination(
  page: number,
  limit: number,
  total: number
): {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
} {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
