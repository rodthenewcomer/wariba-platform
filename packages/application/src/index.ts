/**
 * @wariba/application — Application layer: use-cases that orchestrate
 * domain logic (@wariba/domain) and infrastructure (@wariba/database)
 * behind DTOs. apps/web (presentation) depends on this package instead of
 * @wariba/database directly — the frontend never sees a repository,
 * a table, or a raw ORM model (AGENTS.md §7.1, Engineering Constitution §6.2).
 */

export const PACKAGE_NAME = '@wariba/application';

// Re-exported so apps/web can hold a connection handle without importing
// @wariba/database itself — the boundary this package exists to enforce
// is "no raw queries in the frontend", not "the frontend can't hold a
// handle to pass into these functions".
export { createDbClient, type Db } from '@wariba/database';

export { createUserProfile, type CreateUserProfileParams } from './identity';

export {
  getLatestAccountForUser,
  type TradingAccountDTO,
  type GetLatestAccountForUserParams,
} from './activation';

export {
  listActiveProducts,
  createPurchaseOrder,
  getOrderForUser,
  recordPaymentAttempt,
  processPaymentWebhookEvent,
  type ProductDTO,
  type PurchaseOrderDTO,
  type CreatePurchaseOrderParams,
  type CreatePurchaseOrderResult,
  type RecordPaymentAttemptParams,
  type ProcessPaymentWebhookEventParams,
  type ProcessPaymentWebhookEventResult,
} from './commerce';
