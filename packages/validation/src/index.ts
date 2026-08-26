/**
 * @wariba/validation — Shared Zod schemas validated at system boundaries.
 *
 * Prompt 03 adds identity (signup/login/profile/consent) and commerce
 * (checkout/webhook) schemas — the first real API boundaries.
 */

export const PACKAGE_NAME = '@wariba/validation';

export {
  signupSchema,
  loginSchema,
  passwordResetRequestSchema,
  profileUpdateSchema,
  consentTypeSchema,
  consentInputSchema,
  type SignupInput,
  type LoginInput,
  type PasswordResetRequestInput,
  type ProfileUpdateInput,
  type ConsentInput,
} from './identity';

export {
  productCodeSchema,
  checkoutInputSchema,
  sandboxWebhookEventSchema,
  type ProductCode,
  type CheckoutInput,
  type SandboxWebhookEvent,
} from './commerce';

export {
  supportCategorySchema,
  createSupportTicketSchema,
  supportReplySchema,
  contestationReasonSchema,
  openContestationSchema,
  type SupportCategory,
  type CreateSupportTicketInput,
  type SupportReplyInput,
  type ContestationReason,
  type OpenContestationInput,
} from './support';
