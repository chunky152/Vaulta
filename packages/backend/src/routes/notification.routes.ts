import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';

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
  asyncHandler(notificationController.updatePreferences.bind(notificationController))
);

export default router;
