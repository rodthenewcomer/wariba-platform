import { z } from 'zod';
import { symbolSchema } from './market';

/**
 * Prompt 7 Appendix 07-D §16-§19 — server-evaluated price alerts and their
 * in-app notification history. See packages/database/src/price-alerts.ts
 * for the server-side lifecycle these messages drive.
 */
const decimalString = z.string().regex(/^\d+(\.\d+)?$/, 'must be a non-negative decimal string');

export const alertDirectionSchema = z.enum(['cross_above', 'cross_below']);
export type AlertDirection = z.infer<typeof alertDirectionSchema>;
export const alertSourceSchema = z.enum(['bid', 'ask', 'mid']);
export type AlertSource = z.infer<typeof alertSourceSchema>;
export const alertRecurrenceSchema = z.enum(['once', 'every_crossing']);
export type AlertRecurrence = z.infer<typeof alertRecurrenceSchema>;

export const createPriceAlertMessageSchema = z.object({
  idempotencyKey: z.string().uuid(),
  symbol: symbolSchema,
  direction: alertDirectionSchema,
  thresholdPrice: decimalString,
  source: alertSourceSchema.optional(),
  recurrence: alertRecurrenceSchema,
});
export type CreatePriceAlertMessage = z.infer<typeof createPriceAlertMessageSchema>;

export const modifyPriceAlertMessageSchema = z.object({
  alertId: z.string().uuid(),
  thresholdPrice: decimalString.optional(),
  direction: alertDirectionSchema.optional(),
  source: alertSourceSchema.optional(),
  recurrence: alertRecurrenceSchema.optional(),
});
export type ModifyPriceAlertMessage = z.infer<typeof modifyPriceAlertMessageSchema>;

export const alertIdMessageSchema = z.object({ alertId: z.string().uuid() });
export type AlertIdMessage = z.infer<typeof alertIdMessageSchema>;

export const markNotificationsReadMessageSchema = z.object({
  notificationIds: z.array(z.string().uuid()).min(1),
});
export type MarkNotificationsReadMessage = z.infer<typeof markNotificationsReadMessageSchema>;

export const priceAlertDtoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  symbol: symbolSchema,
  direction: alertDirectionSchema,
  thresholdPrice: z.string(),
  source: alertSourceSchema,
  recurrence: alertRecurrenceSchema,
  enabled: z.boolean(),
  lastObservedSideAbove: z.boolean().nullable(),
  lastTriggeredAt: z.string().datetime().nullable(),
  triggerCount: z.number().int().nonnegative(),
  version: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type PriceAlertDTO = z.infer<typeof priceAlertDtoSchema>;

export const alertResultMessageSchema = z.object({
  type: z.literal('alert_result'),
  status: z.enum(['ok', 'rejected']),
  rejectionCode: z.string().nullable(),
  alert: priceAlertDtoSchema.nullable(),
});
export type AlertResultMessage = z.infer<typeof alertResultMessageSchema>;

export const alertNotificationDtoSchema = z.object({
  id: z.string().uuid(),
  alertId: z.string().uuid(),
  symbol: symbolSchema,
  direction: alertDirectionSchema,
  thresholdPrice: z.string(),
  triggeringPrice: z.string(),
  source: alertSourceSchema,
  readAt: z.string().datetime().nullable(),
  occurredAt: z.string().datetime(),
});
export type AlertNotificationDTO = z.infer<typeof alertNotificationDtoSchema>;

/**
 * Pushed on user.{userId}.notifications (userNotificationsChannel) as the
 * initial state on subscribe — this channel existed in this package since
 * Prompt 01 but had no real producer or consumer anywhere until this
 * appendix.
 */
export const notificationsSnapshotMessageSchema = z.object({
  alerts: z.array(priceAlertDtoSchema),
  notifications: z.array(alertNotificationDtoSchema),
  unreadCount: z.number().int().nonnegative(),
});
export type NotificationsSnapshotMessage = z.infer<typeof notificationsSnapshotMessageSchema>;

/** Pushed live on the same channel the instant an alert fires. */
export const newAlertNotificationMessageSchema = z.object({
  notification: alertNotificationDtoSchema,
});
export type NewAlertNotificationMessage = z.infer<typeof newAlertNotificationMessageSchema>;
