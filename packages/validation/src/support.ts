import { z } from 'zod';

/**
 * Phase 3.2 — the support boundary.
 *
 * Every field a trader can send arrives here first. Two of them matter more
 * than the rest:
 *
 * - `accountId` is a **claim**, not a fact. The schema only checks it is a
 *   uuid; whether it belongs to the person sending it is decided by the
 *   server against the database (`createSupportTicket` /
 *   `openContestation`). A shape check has never been an ownership check.
 * - `priority` is absent, and deliberately so. It is an operator's triage
 *   decision. There is no field here, no grant on the table, and therefore no
 *   route by which a trader can promote their own request.
 *
 * Lengths mirror the database's own check constraints exactly, so a value the
 * form accepts cannot be one the table refuses — a mismatch there turns a
 * validation message into a 500.
 */

export const supportCategorySchema = z.enum([
  'general',
  'account',
  'trading',
  'risk',
  'breach',
  'performance',
  'payout',
  'billing',
  'identity',
  'technical',
]);
export type SupportCategory = z.infer<typeof supportCategorySchema>;

export const createSupportTicketSchema = z.object({
  category: supportCategorySchema,
  /** Null when the request is not about one account. Ownership is verified server-side. */
  accountId: z.string().uuid().nullable(),
  subject: z
    .string()
    .trim()
    .min(3, 'Le sujet doit contenir au moins 3 caractères.')
    .max(160, 'Le sujet ne peut pas dépasser 160 caractères.'),
  body: z
    .string()
    .trim()
    .min(10, 'Décrivez votre demande en quelques phrases (10 caractères minimum).')
    .max(4000, 'Le message ne peut pas dépasser 4 000 caractères.'),
});
export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;

export const supportReplySchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Écrivez un message avant d’envoyer.')
    .max(4000, 'Le message ne peut pas dépasser 4 000 caractères.'),
});
export type SupportReplyInput = z.infer<typeof supportReplySchema>;

export const contestationReasonSchema = z.enum([
  'rule_misapplied',
  'market_data_disputed',
  'execution_error',
  'evidence_incomplete',
  'other',
]);
export type ContestationReason = z.infer<typeof contestationReasonSchema>;

export const openContestationSchema = z.object({
  accountId: z.string().uuid(),
  /** The risk-violation being contested. Verified to exist on that account. */
  targetId: z.string().uuid(),
  reasonCategory: contestationReasonSchema,
  /*
   * Twenty characters is not bureaucracy.
   *
   * A contestation is reviewed by a person against recorded evidence, and
   * "pas d'accord" gives that person nothing to review — they would have to
   * come back and ask, which costs the trader a round trip at the worst
   * possible moment. The floor asks for one real sentence.
   */
  traderStatement: z
    .string()
    .trim()
    .min(20, 'Expliquez en quelques phrases ce que vous contestez (20 caractères minimum).')
    .max(4000, 'Votre explication ne peut pas dépasser 4 000 caractères.'),
});
export type OpenContestationInput = z.infer<typeof openContestationSchema>;
