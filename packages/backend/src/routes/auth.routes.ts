import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import {
  loginRateLimiter,
  passwordResetRateLimiter,
} from '../middleware/rateLimit.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Public routes
router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(authController.register.bind(authController))
);

router.post(
  '/login',
  loginRateLimiter,
  validate(loginSchema),
  asyncHandler(authController.login.bind(authController))
);

router.post(
  '/refresh',
  validate(refreshTokenSchema),
  asyncHandler(authController.refreshToken.bind(authController))
);

router.post(
  '/forgot-password',
  passwordResetRateLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword.bind(authController))
);

router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword.bind(authController))
);

router.post(
  '/verify-email',
  validate(verifyEmailSchema),
  asyncHandler(authController.verifyEmail.bind(authController))
);

// Protected routes
router.post(
  '/logout',
  authenticate,
  asyncHandler(authController.logout.bind(authController))
);

router.post(
  '/logout-all',
  authenticate,
  asyncHandler(authController.logoutAll.bind(authController))
);

router.get(
  '/me',
  authenticate,
  asyncHandler(authController.getProfile.bind(authController))
);

router.put(
  '/me',
  authenticate,
  validate(updateProfileSchema),
  asyncHandler(authController.updateProfile.bind(authController))
);

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword.bind(authController))
);

export default router;
