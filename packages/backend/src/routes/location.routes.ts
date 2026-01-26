import { Router } from 'express';
import { locationController } from '../controllers/location.controller.js';
import { authenticate, adminOnly, optionalAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import {
  createLocationSchema,
  updateLocationSchema,
  locationListSchema,
  nearbySearchSchema,
  locationIdSchema,
} from '../validators/location.validator.js';

const router = Router();

// Public routes
router.get(
  '/',
  validate(locationListSchema, 'query'),
  asyncHandler(locationController.getLocations.bind(locationController))
);

router.get(
  '/nearby',
  validate(nearbySearchSchema, 'query'),
  asyncHandler(locationController.getNearbyLocations.bind(locationController))
);

router.get(
  '/featured',
  asyncHandler(locationController.getFeaturedLocations.bind(locationController))
);

router.get(
  '/slug/:slug',
  asyncHandler(locationController.getLocationBySlug.bind(locationController))
);

router.get(
  '/:id',
  validate(locationIdSchema, 'params'),
  asyncHandler(locationController.getLocationById.bind(locationController))
);

router.get(
  '/:id/units',
  validate(locationIdSchema, 'params'),
  asyncHandler(locationController.getLocationWithUnits.bind(locationController))
);

// Admin routes
router.post(
  '/',
  authenticate,
  adminOnly,
  validate(createLocationSchema),
  asyncHandler(locationController.createLocation.bind(locationController))
);

router.put(
  '/:id',
  authenticate,
  adminOnly,
  validate(locationIdSchema, 'params'),
  validate(updateLocationSchema),
  asyncHandler(locationController.updateLocation.bind(locationController))
);

router.delete(
  '/:id',
  authenticate,
  adminOnly,
  validate(locationIdSchema, 'params'),
  asyncHandler(locationController.deleteLocation.bind(locationController))
);

router.get(
  '/:id/stats',
  authenticate,
  adminOnly,
  validate(locationIdSchema, 'params'),
  asyncHandler(locationController.getLocationStats.bind(locationController))
);

export default router;
