import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import locationRoutes from './modules/locations/location.routes.js';
import unitRoutes from './modules/units/unit.routes.js';
import bookingRoutes from './modules/bookings/booking.routes.js';
import paymentRoutes from './modules/payments/payment.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import inventoryRoutes, { bookingInventoryRouter } from './modules/inventory/inventory.routes.js';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Unbur API is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/locations', locationRoutes);
router.use('/units', unitRoutes);
router.use('/bookings', bookingRoutes);
router.use('/bookings', bookingInventoryRouter); // Inventory routes nested under bookings
router.use('/payments', paymentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/admin', adminRoutes);

export default router;
