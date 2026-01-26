import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../types/index.js';

type RequestLocation = 'body' | 'query' | 'params';

// Validate request data against a Zod schema
export function validate(
  schema: ZodSchema,
  location: RequestLocation = 'body'
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const data = req[location];
      const validated = schema.parse(data);

      // Replace the request data with validated/transformed data
      req[location] = validated;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};

        error.errors.forEach((err) => {
          const path = err.path.join('.') || 'value';
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path]?.push(err.message);
        });

        next(new ValidationError('Validation failed', errors));
      } else {
        next(error);
      }
    }
  };
}

// Validate multiple locations at once
export function validateMultiple(schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const allErrors: Record<string, string[]> = {};
    let hasErrors = false;

    for (const [location, schema] of Object.entries(schemas)) {
      if (!schema) continue;

      try {
        const data = req[location as RequestLocation];
        const validated = schema.parse(data);
        req[location as RequestLocation] = validated;
      } catch (error) {
        if (error instanceof ZodError) {
          hasErrors = true;
          error.errors.forEach((err) => {
            const path = `${location}.${err.path.join('.')}` || location;
            if (!allErrors[path]) {
              allErrors[path] = [];
            }
            allErrors[path]?.push(err.message);
          });
        }
      }
    }

    if (hasErrors) {
      next(new ValidationError('Validation failed', allErrors));
    } else {
      next();
    }
  };
}

// Sanitize string input (trim whitespace, normalize)
export function sanitizeString(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

// Sanitize object strings recursively
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };

  for (const key in result) {
    const value = result[key];
    if (typeof value === 'string') {
      (result as Record<string, unknown>)[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = sanitizeObject(value as Record<string, unknown>);
    }
  }

  return result;
}
