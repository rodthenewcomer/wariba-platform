/**
 * @wariba/database — Kysely database types, transaction helpers, repositories, locks and outbox.
 *
 * Prompt 03 adds the identity/commerce/activation schema types, the DB
 * client factory, and the activation + payment-event repositories.
 */

export const PACKAGE_NAME = '@wariba/database';

export { createDbClient, type Db } from './client.js';
export type { Database } from './schema.js';
export { activateEvaluationAccount, type ActivateEvaluationAccountParams, type ActivatedAccount } from './activation.js';
export { recordPaymentEvent, type RecordPaymentEventParams, type RecordPaymentEventResult } from './payment-events.js';
