import { Router } from 'express';
import authRoutes from './auth.routes.js';
import locationRoutes from './location.routes.js';
import unitRoutes from './unit.routes.js';
import bookingRoutes from './booking.routes.js';
import paymentRoutes from './payment.routes.js';
import notificationRoutes from './notification.routes.js';
import adminRoutes from './admin.routes.js';
import inventoryRoutes, { bookingInventoryRouter } from './inventory.routes.js';

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
