import { z } from 'zod';

// Notification preferences update schema — only the known preference
// toggles are accepted; any other field (e.g. userId) is stripped by
// zod rather than passed through to the update query.
export const updatePreferencesSchema = z.object({
  emailBooking: z.boolean().optional(),
  emailPayment: z.boolean().optional(),
  emailReminder: z.boolean().optional(),
  emailPromo: z.boolean().optional(),
  smsBooking: z.boolean().optional(),
  smsPayment: z.boolean().optional(),
  smsReminder: z.boolean().optional(),
  smsPromo: z.boolean().optional(),
  pushBooking: z.boolean().optional(),
  pushPayment: z.boolean().optional(),
  pushReminder: z.boolean().optional(),
  pushPromo: z.boolean().optional(),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
