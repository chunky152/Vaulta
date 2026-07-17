import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError, ApiResponse } from '../types/index.js';
import { isDevelopment } from '../config/index.js';

// Not found handler
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const response: ApiResponse = {
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  };

  res.status(404).json(response);
}

// Global error handler
export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    error.errors.forEach((err) => {
      const path = err.path.join('.');
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path]?.push(err.message);
    });

    const response: ApiResponse = {
      success: false,
      error: 'Validation failed',
      errors,
    };

    res.status(400).json(response);
    return;
  }

  // Handle AppError (our custom errors)
  if (error instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      error: error.message,
      errors: error.errors,
    };

    res.status(error.statusCode).json(response);
    return;
  }

  // Handle Mongoose validation errors
  if (error instanceof mongoose.Error.ValidationError) {
    const errors: Record<string, string[]> = {};
    for (const [path, err] of Object.entries(error.errors)) {
      errors[path] = [err.message];
    }

    const response: ApiResponse = {
      success: false,
      error: 'Validation failed',
      errors,
    };

    res.status(400).json(response);
    return;
  }

  // Handle Mongoose cast errors (malformed ObjectId, etc.)
  if (error instanceof mongoose.Error.CastError) {
    const response: ApiResponse = {
      success: false,
      error: `Invalid value for ${error.path}`,
    };

    res.status(400).json(response);
    return;
  }

  // Handle MongoDB duplicate key errors
  const mongoError = error as Error & { code?: number; keyValue?: Record<string, unknown> };
  if (mongoError.code === 11000) {
    const fields = Object.keys(mongoError.keyValue ?? {}).join(', ') || 'field';
    const response: ApiResponse = {
      success: false,
      error: `Duplicate entry for ${fields}`,
    };

    res.status(409).json(response);
    return;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid token',
    };

    res.status(401).json(response);
    return;
  }

  if (error.name === 'TokenExpiredError') {
    const response: ApiResponse = {
      success: false,
      error: 'Token has expired',
    };

    res.status(401).json(response);
    return;
  }

  // Default error response
  const response: ApiResponse = {
    success: false,
    error: isDevelopment ? error.message : 'Internal server error',
  };

  res.status(500).json(response);
}

// Async handler wrapper to catch errors in async route handlers.
// Generic so controllers can type req more narrowly than express.Request
// (e.g. AuthenticatedRequest with a validated body/query).
export function asyncHandler<Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req as Req, res, next)).catch(next);
  };
}
