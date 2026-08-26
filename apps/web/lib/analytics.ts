import { createLogger } from '@wariba/observability';

/** Prompt 06 ANALYTICS — the 6 required Hub events. */
export type HubAnalyticsEvent =
  | 'hub_viewed'
  | 'mission_viewed'
  | 'risk_detail_opened'
  | 'policy_opened'
  | 'next_action_clicked'
  | 'support_opened'
  /*
   * Help Center — content master §14.
   *
   * Non-financial and deliberately coarse: which article was opened and from
   * where, never the raw search string. A query a trader types while their
   * account is failing can carry an account reference or a name, and this sink
   * is a structured log with no retention policy attached to it yet.
   */
  | 'help_article_viewed'
  | 'help_search_no_result'
  | 'help_support_cta'
  | 'performance_rules_viewed'
  | 'performance_account_opened';

// console.info works identically server- and client-side in Next.js (both
// land in captured logs) — no Node-only sink, so this is safe to import
// from server components, client components, and route handlers alike.
// Sink is a structured log for now; swapping in a real analytics vendor is
// a separate decision (see DECISION_LOG.md).
const logger = createLogger({
  service: 'web',
  module: 'hub.analytics',
  // eslint-disable-next-line no-console -- sanctioned sink for structured analytics logs.
  write: (line) => console.info(line),
});

export function trackEvent(event: HubAnalyticsEvent, context?: Record<string, unknown>): void {
  logger.info(event, context);
}
