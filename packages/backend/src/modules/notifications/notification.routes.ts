import { Router } from 'express';
import { notificationController } from './notification.controller.js';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import { asyncHandler } from '../../shared/middleware/error.middleware.js';
import { validate } from '../../shared/middleware/validation.middleware.js';
import { updatePreferencesSchema } from './notification.validator.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get notifications
router.get(
  '/',
  asyncHandler(notificationController.getNotifications.bind(notificationController))
);

// Mark as read
router.put(
  '/:id/read',
  asyncHandler(notificationController.markAsRead.bind(notificationController))
);

// Mark all as read
router.put(
  '/read-all',
  asyncHandler(notificationController.markAllAsRead.bind(notificationController))
);

// Delete notification
router.delete(
  '/:id',
  asyncHandler(notificationController.deleteNotification.bind(notificationController))
);

// Update preferences
router.put(
  '/preferences',
  validate(updatePreferencesSchema),
  asyncHandler(notificationController.updatePreferences.bind(notificationController))
);

export default router;
