import { z } from 'zod';
import { UnitSize, UnitStatus } from '../models/StorageUnit.js';

// Dimensions schema
const dimensionsSchema = z.object({
  width: z.number().positive('Width must be positive'),
  height: z.number().positive('Height must be positive'),
  depth: z.number().positive('Depth must be positive'),
}).optional();

// Features schema
const featuresSchema = z.array(
  z.enum([
    'climate_controlled',
    'secure',
    'accessible',
    '24_7_access',
    'cctv',
    'insurance_included',
    'ground_floor',
    'elevator_access',
  ])
).optional();

// Create unit schema
export const createUnitSchema = z.object({
  locationId: z.string().uuid('Invalid location ID'),
  unitNumber: z
    .string()
    .min(1, 'Unit number is required')
    .max(50, 'Unit number must be less than 50 characters'),
  name: z
    .string()
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  size: z.nativeEnum(UnitSize, {
    errorMap: () => ({ message: 'Invalid unit size' }),
  }),
  dimensions: dimensionsSchema,
  basePriceHourly: z
    .number()
    .positive('Hourly price must be positive'),
  basePriceDaily: z
    .number()
    .positive('Daily price must be positive'),
  basePriceMonthly: z
    .number()
    .positive('Monthly price must be positive')
    .optional(),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter code')
    .default('USD'),
  features: featuresSchema,
  floor: z.number().int('Floor must be an integer').optional(),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;

// Update unit schema
export const updateUnitSchema = createUnitSchema.partial().omit({ locationId: true });

export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;

// Unit status update schema
export const updateUnitStatusSchema = z.object({
  status: z.nativeEnum(UnitStatus, {
    errorMap: () => ({ message: 'Invalid unit status' }),
  }),
});

export type UpdateUnitStatusInput = z.infer<typeof updateUnitStatusSchema>;

// Unit search schema (query params)
export const unitSearchSchema = z.object({
  locationId: z.string().uuid().optional(),
  size: z.nativeEnum(UnitSize).optional(),
  status: z.nativeEnum(UnitStatus).optional(),
  minPriceHourly: z.coerce.number().positive().optional(),
  maxPriceHourly: z.coerce.number().positive().optional(),
  minPriceDaily: z.coerce.number().positive().optional(),
  maxPriceDaily: z.coerce.number().positive().optional(),
  features: z
    .string()
    .transform((v) => v.split(','))
    .optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['unitNumber', 'size', 'basePriceHourly', 'basePriceDaily', 'createdAt']).default('unitNumber'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type UnitSearchInput = z.infer<typeof unitSearchSchema>;

// Unit availability check schema
export const unitAvailabilitySchema = z.object({
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
}).refine(
  (data) => data.endTime > data.startTime,
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  }
).refine(
  (data) => data.startTime >= new Date(),
  {
    message: 'Start time must be in the future',
    path: ['startTime'],
  }
);

export type UnitAvailabilityInput = z.infer<typeof unitAvailabilitySchema>;

// Unit ID param schema
export const unitIdSchema = z.object({
  id: z.string().uuid('Invalid unit ID'),
});

export type UnitIdInput = z.infer<typeof unitIdSchema>;

// Bulk create units schema
export const bulkCreateUnitsSchema = z.object({
  locationId: z.string().uuid('Invalid location ID'),
  units: z.array(createUnitSchema.omit({ locationId: true })).min(1).max(50),
});

export type BulkCreateUnitsInput = z.infer<typeof bulkCreateUnitsSchema>;
