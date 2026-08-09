import { z } from 'zod';

/**
 * Prompt 08 Phase F — WARIBA Performance progress and payout requests, the
 * trader-facing wire shapes for the Phase C/D domain
 * (packages/database/src/performance.ts, payouts.ts).
 */
const decimalString = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'must be a decimal string, never a float');

export const performanceCycleStatusSchema = z.enum(['active', 'payout_pending', 'closed']);
export type PerformanceCycleStatusDTO = z.infer<typeof performanceCycleStatusSchema>;

/**
 * Buffer/Performance-Days/consistency progress toward the current cycle's
 * payout, plus the sandbox KYC/payout-method flags — everything the trader
 * needs to see *why* a payout is or isn't available yet, without a single
 * vague "Not eligible" (Prompt 08 §26).
 */
export const performanceProgressDtoSchema = z.object({
  cycleNumber: z.number().int().positive(),
  cycleStatus: performanceCycleStatusSchema,
  realizedBalance: z.string(),
  bufferFloor: z.string(),
  eligibleExcess: z.string(),
  bufferReached: z.boolean(),
  performanceDayThreshold: z.string(),
  performanceDaysCompleted: z.number().int().nonnegative(),
  performanceDaysRequired: z.number().int().positive(),
  consistencyRatio: z.string().nullable(),
  consistencyCompliant: z.boolean(),
  capApplied: z.string(),
  traderSplitRate: z.string(),
  kycVerified: z.boolean(),
  payoutMethodConfigured: z.boolean(),
  openPositionBlocking: z.boolean(),
  pendingOrderBlocking: z.boolean(),
});
export type PerformanceProgressDTO = z.infer<typeof performanceProgressDtoSchema>;

export const payoutRequestStatusSchema = z.enum([
  'pending_review',
  'needs_information',
  'approved',
  'rejected',
  'processing',
  'paid',
  'failed',
  'cancelled',
  'reversed',
]);
export type PayoutRequestStatus = z.infer<typeof payoutRequestStatusSchema>;

export const payoutRequestDtoSchema = z.object({
  id: z.string().uuid(),
  cycleNumber: z.number().int().positive(),
  status: payoutRequestStatusSchema,
  requestedNetTraderCash: z.string(),
  approvedGrossBase: z.string().nullable(),
  traderNetCash: z.string().nullable(),
  waribaShare: z.string().nullable(),
  rejectionCode: z.string().nullable(),
  requestedAt: z.string().datetime(),
  paidAt: z.string().datetime().nullable(),
});
export type PayoutRequestDTO = z.infer<typeof payoutRequestDtoSchema>;

export const requestPayoutMessageSchema = z.object({
  accountId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  requestedNetTraderCash: decimalString,
});
export type RequestPayoutMessage = z.infer<typeof requestPayoutMessageSchema>;

/**
 * The direct response to a create_payout_request command — only ever
 * 'pending_review' (created) or 'rejected' (eligibility failed, nothing
 * persisted). Approval/settlement are staff/provider actions (Control,
 * Phase G) that arrive later as a fresh account.snapshot, not through this
 * message.
 */
export const payoutResultMessageSchema = z.object({
  type: z.literal('payout_result'),
  status: z.enum(['pending_review', 'rejected']),
  rejectionCode: z.string().nullable(),
  request: payoutRequestDtoSchema.nullable(),
});
export type PayoutResultMessage = z.infer<typeof payoutResultMessageSchema>;
