import { Router } from 'express';
import { inventoryController } from '../controllers/inventory.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  listInventorySchema,
} from '../validators/inventory.validator.js';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all user's inventory items
router.get(
  '/',
  validate(listInventorySchema, 'query'),
  asyncHandler(inventoryController.getAllItems.bind(inventoryController))
);

// Get inventory summary
router.get(
  '/summary',
  asyncHandler(inventoryController.getSummary.bind(inventoryController))
);

// Get a single inventory item
router.get(
  '/:itemId',
  validate(z.object({ itemId: z.string().uuid() }), 'params'),
  asyncHandler(inventoryController.getItem.bind(inventoryController))
);

// Update an inventory item
router.put(
  '/:itemId',
  validate(z.object({ itemId: z.string().uuid() }), 'params'),
  validate(updateInventoryItemSchema),
  asyncHandler(inventoryController.updateItem.bind(inventoryController))
);

// Delete an inventory item
router.delete(
  '/:itemId',
  validate(z.object({ itemId: z.string().uuid() }), 'params'),
  asyncHandler(inventoryController.deleteItem.bind(inventoryController))
);

// Nested routes under bookings - add item to booking and get booking items
// These will be mounted separately or added to booking routes

export default router;

// Export booking inventory routes to be mounted in booking routes
export const bookingInventoryRouter = Router();

bookingInventoryRouter.use(authenticate);

// Get items for a specific booking
bookingInventoryRouter.get(
  '/:bookingId/inventory',
  validate(z.object({ bookingId: z.string().uuid() }), 'params'),
  validate(listInventorySchema, 'query'),
  asyncHandler(inventoryController.getBookingItems.bind(inventoryController))
);

// Add item to a booking
bookingInventoryRouter.post(
  '/:bookingId/inventory',
  validate(z.object({ bookingId: z.string().uuid() }), 'params'),
  validate(createInventoryItemSchema),
  asyncHandler(inventoryController.addItem.bind(inventoryController))
);
