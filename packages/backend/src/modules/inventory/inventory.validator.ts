import { z } from 'zod';

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

export const ITEM_CONDITIONS = ['EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED'] as const;

export const createInventoryItemSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  category: z.string().min(1, 'Category is required').max(100),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
  condition: z.enum(ITEM_CONDITIONS).default('GOOD'),
  estimatedValue: z.number().min(0, 'Estimated value cannot be negative').optional(),
  photos: z.array(z.string().url()).max(10, 'Maximum 10 photos allowed').default([]),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

export const updateInventoryItemSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters')
    .optional(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  category: z.string().min(1).max(100).optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').optional(),
  condition: z.enum(ITEM_CONDITIONS).optional(),
  estimatedValue: z.number().min(0, 'Estimated value cannot be negative').nullable().optional(),
  photos: z.array(z.string().url()).max(10, 'Maximum 10 photos allowed').optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

export const listInventorySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  search: z.string().optional(),
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
export type ListInventoryInput = z.infer<typeof listInventorySchema>;
