import { Router } from 'express';
import { unitController } from '../controllers/unit.controller.js';
import { authenticate, adminOnly } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import {
  createUnitSchema,
  updateUnitSchema,
  unitSearchSchema,
  unitIdSchema,
  unitAvailabilitySchema,
  updateUnitStatusSchema,
  bulkCreateUnitsSchema,
} from '../validators/unit.validator.js';

const router = Router();

// Public routes
router.get(
  '/',
  validate(unitSearchSchema, 'query'),
  asyncHandler(unitController.getUnits.bind(unitController))
);

router.get(
  '/:id',
  validate(unitIdSchema, 'params'),
  asyncHandler(unitController.getUnitById.bind(unitController))
);

router.get(
  '/:id/availability',
  validate(unitIdSchema, 'params'),
  validate(unitAvailabilitySchema, 'query'),
  asyncHandler(unitController.checkAvailability.bind(unitController))
);

router.get(
  '/:id/prices',
  validate(unitIdSchema, 'params'),
  asyncHandler(unitController.getPriceEstimates.bind(unitController))
);

router.get(
  '/:id/calculate-price',
  validate(unitIdSchema, 'params'),
  asyncHandler(unitController.calculatePrice.bind(unitController))
);

// Location-based availability
router.get(
  '/location/:locationId/available',
  asyncHandler(unitController.getAvailableUnits.bind(unitController))
);

// Admin routes
router.post(
  '/',
  authenticate,
  adminOnly,
  validate(createUnitSchema),
  asyncHandler(unitController.createUnit.bind(unitController))
);

router.post(
  '/bulk',
  authenticate,
  adminOnly,
  validate(bulkCreateUnitsSchema),
  asyncHandler(unitController.createBulkUnits.bind(unitController))
);

router.put(
  '/:id',
  authenticate,
  adminOnly,
  validate(unitIdSchema, 'params'),
  validate(updateUnitSchema),
  asyncHandler(unitController.updateUnit.bind(unitController))
);

router.patch(
  '/:id/status',
  authenticate,
  adminOnly,
  validate(unitIdSchema, 'params'),
  validate(updateUnitStatusSchema),
  asyncHandler(unitController.updateStatus.bind(unitController))
);

router.delete(
  '/:id',
  authenticate,
  adminOnly,
  validate(unitIdSchema, 'params'),
  asyncHandler(unitController.deleteUnit.bind(unitController))
);

export default router;
