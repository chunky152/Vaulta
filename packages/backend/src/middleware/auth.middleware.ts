import { Response, NextFunction } from 'express';
import { User, UserRole } from '../models/User.js';
import {
  AuthenticatedRequest,
  AuthenticationError,
  AuthorizationError,
} from '../types/index.js';
import { verifyAccessToken } from '../utils/jwt.js';
import mongoose from 'mongoose';

// Extract token from Authorization header
function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

// Authentication middleware - requires valid JWT
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    if (error instanceof Error) {
      next(new AuthenticationError(error.message));
    } else {
      next(new AuthenticationError());
    }
  }
}

// Optional authentication - sets user if token present, continues otherwise
export function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  try {
    const token = extractToken(req.headers.authorization);

    if (token) {
      const payload = verifyAccessToken(token);
      req.user = {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
      };
    }

    next();
  } catch {
    // Token invalid or expired, continue without user
    next();
  }
}

// Role-based authorization middleware factory
export function authorize(...allowedRoles: UserRole[]) {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      next(new AuthenticationError());
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(
        new AuthorizationError(
          `This action requires one of the following roles: ${allowedRoles.join(', ')}`
        )
      );
      return;
    }

    next();
  };
}

// Admin only middleware (shorthand)
export const adminOnly = authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN);

// Super admin only middleware (shorthand)
export const superAdminOnly = authorize(UserRole.SUPER_ADMIN);

// Check if user owns the resource or is admin
export function ownerOrAdmin(
  getUserId: (req: AuthenticatedRequest) => string | undefined
) {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      next(new AuthenticationError());
      return;
    }

    const resourceUserId = getUserId(req);

    if (!resourceUserId) {
      next(new AuthorizationError('Resource not found'));
      return;
    }

    const isOwner = req.user.id === resourceUserId;
    const isAdmin =
      req.user.role === UserRole.ADMIN ||
      req.user.role === UserRole.SUPER_ADMIN;

    if (!isOwner && !isAdmin) {
      next(new AuthorizationError('You can only access your own resources'));
      return;
    }

    next();
  };
}

// Verify user is active (not suspended/deleted)
export async function verifyActiveUser(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AuthenticationError();
    }

    const objectId = new mongoose.Types.ObjectId(req.user.id);
    const user = await User.findById(objectId).select('isActive');

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (!user.isActive) {
      throw new AuthorizationError('Your account has been suspended');
    }

    next();
  } catch (error) {
    next(error);
  }
}
