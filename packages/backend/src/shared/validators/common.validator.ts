import { z } from 'zod';

// MongoDB ObjectId (24-char hex). The app stores documents in MongoDB,
// so ids in params/bodies are ObjectIds, not UUIDs.
export const objectId = (message = 'Invalid ID'): z.ZodString =>
  z.string().regex(/^[0-9a-f]{24}$/i, message);
