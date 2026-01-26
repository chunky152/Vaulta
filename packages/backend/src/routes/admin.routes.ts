import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { authenticate, adminOnly } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(adminOnly);

// Dashboard
router.get(
  '/dashboard',
  asyncHandler(adminController.getDashboardStats.bind(adminController))
);

// Bookings
router.get(
  '/bookings',
  asyncHandler(adminController.getAllBookings.bind(adminController))
);

// Users
router.get(
  '/users',
  asyncHandler(adminController.getAllUsers.bind(adminController))
);

router.patch(
  '/users/:id',
  asyncHandler(adminController.updateUserStatus.bind(adminController))
);

// Occupancy
router.get(
  '/occupancy',
  asyncHandler(adminController.getOccupancyData.bind(adminController))
);

// Analytics
router.get(
  '/analytics',
  asyncHandler(adminController.getAnalytics.bind(adminController))
);

// Transactions
router.get(
  '/transactions',
  asyncHandler(adminController.getTransactionReports.bind(adminController))
);

export default router;
