import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ApiResponse } from '../types/index.js';
import { config, isDevelopment } from '../config/index.js';

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

  // Handle Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as { code?: string; meta?: { target?: string[] } };

    let message = 'Database error';
    let statusCode = 500;

    switch (prismaError.code) {
      case 'P2002':
        message = `Duplicate entry for ${prismaError.meta?.target?.join(', ') ?? 'field'}`;
        statusCode = 409;
        break;
      case 'P2025':
        message = 'Record not found';
        statusCode = 404;
        break;
      case 'P2003':
        message = 'Foreign key constraint failed';
        statusCode = 400;
        break;
    }

    const response: ApiResponse = {
      success: false,
      error: message,
    };

    res.status(statusCode).json(response);
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

// Async handler wrapper to catch errors in async route handlers
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
