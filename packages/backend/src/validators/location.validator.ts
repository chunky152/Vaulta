import { z } from 'zod';

// Coordinates validation
const latitudeSchema = z
  .number()
  .min(-90, 'Latitude must be between -90 and 90')
  .max(90, 'Latitude must be between -90 and 90');

const longitudeSchema = z
  .number()
  .min(-180, 'Longitude must be between -180 and 180')
  .max(180, 'Longitude must be between -180 and 180');

// Operating hours schema
const operatingHoursSchema = z.object({
  monday: z.object({
    open: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    close: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    closed: z.boolean().optional(),
  }).optional(),
  tuesday: z.object({
    open: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    close: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    closed: z.boolean().optional(),
  }).optional(),
  wednesday: z.object({
    open: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    close: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    closed: z.boolean().optional(),
  }).optional(),
  thursday: z.object({
    open: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    close: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    closed: z.boolean().optional(),
  }).optional(),
  friday: z.object({
    open: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    close: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    closed: z.boolean().optional(),
  }).optional(),
  saturday: z.object({
    open: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    close: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    closed: z.boolean().optional(),
  }).optional(),
  sunday: z.object({
    open: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    close: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    closed: z.boolean().optional(),
  }).optional(),
}).optional();

// Create location schema
export const createLocationSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name must be less than 200 characters')
    .transform((v) => v.trim()),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  address: z
    .string()
    .min(1, 'Address is required')
    .max(500, 'Address must be less than 500 characters'),
  city: z
    .string()
    .min(1, 'City is required')
    .max(100, 'City must be less than 100 characters'),
  state: z
    .string()
    .max(100, 'State must be less than 100 characters')
    .optional(),
  country: z
    .string()
    .min(1, 'Country is required')
    .max(100, 'Country must be less than 100 characters'),
  postalCode: z
    .string()
    .max(20, 'Postal code must be less than 20 characters')
    .optional(),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  operatingHours: operatingHoursSchema,
  contactPhone: z
    .string()
    .max(20, 'Contact phone must be less than 20 characters')
    .optional(),
  contactEmail: z.string().email('Invalid email address').optional(),
  images: z.array(z.string().url('Invalid image URL')).optional(),
  amenities: z.array(z.string()).optional(),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;

// Update location schema
export const updateLocationSchema = createLocationSchema.partial();

export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

// Nearby search schema (query params)
export const nearbySearchSchema = z.object({
  latitude: z.coerce.number().pipe(latitudeSchema),
  longitude: z.coerce.number().pipe(longitudeSchema),
  radiusKm: z.coerce
    .number()
    .min(0.1, 'Radius must be at least 0.1 km')
    .max(100, 'Radius cannot exceed 100 km')
    .default(10),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type NearbySearchInput = z.infer<typeof nearbySearchSchema>;

// Location list query schema
export const locationListSchema = z.object({
  city: z.string().optional(),
  country: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'rating', 'createdAt', 'reviewCount']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type LocationListInput = z.infer<typeof locationListSchema>;

// Location ID param schema
export const locationIdSchema = z.object({
  id: z.string().uuid('Invalid location ID'),
});

export type LocationIdInput = z.infer<typeof locationIdSchema>;
