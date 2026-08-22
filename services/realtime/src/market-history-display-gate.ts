import type { DisplayRights, HistoricalMarketDataProvider } from '@wariba/adapters';

/**
 * WX3.1 §5 — the production display-rights gate.
 *
 * WX3 shipped a development configuration whose Twelve Data Basic key is
 * documented as internal, non-display use, and nothing in the running system
 * said so. That is the failure mode this guards: not a licence violation the
 * code could detect, but a deployment quietly presenting a development-tier key
 * as a cleared market-data licence because no surface ever asked the question.
 *
 * It draws no legal conclusion and blocks nothing. Trading, execution and risk
 * are untouched — market-data licensing and execution safety are different
 * concerns and coupling them would take a commercial question and turn it into
 * an outage. What it does is make the status unmissable at startup and legible
 * in health, so the answer comes from a human who can actually give it.
 */

export type DisplayLicenseStatus =
  'cleared_external_display' | 'requires_human_commercial_clearance';

export interface DisplayLicenseAssessment {
  status: DisplayLicenseStatus;
  displayRights: DisplayRights;
  provider: string;
  sourceId: string;
  /** True when this deployment serves charts to customers. */
  customerFacing: boolean;
}

interface GateLogger {
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown>): void;
}

/**
 * A deployment is treated as customer-facing everywhere except local
 * development. Staging and preview are included on purpose: they are commonly
 * reachable by people outside the team, and the safe default for "might a
 * customer see this" is yes.
 */
function isCustomerFacing(appEnv: string): boolean {
  return appEnv !== 'local';
}

export function assessDisplayLicense(
  provider: HistoricalMarketDataProvider,
  appEnv: string,
): DisplayLicenseAssessment {
  const displayRights = provider.source.capabilities.displayRights ?? 'unknown';
  return {
    status:
      displayRights === 'external'
        ? 'cleared_external_display'
        : 'requires_human_commercial_clearance',
    displayRights,
    provider: provider.providerName,
    sourceId: provider.source.id,
    customerFacing: isCustomerFacing(appEnv),
  };
}

/**
 * Reports the assessment at startup.
 *
 * Error level when a customer-facing environment is serving market data whose
 * external display rights are not stated — not because the code knows the
 * licence is inadequate, but because nobody has recorded that it is adequate,
 * and an unanswered question about redistributing a vendor's prices to paying
 * customers deserves to be loud.
 */
export function reportDisplayLicense(
  assessment: DisplayLicenseAssessment,
  logger: GateLogger,
): void {
  const fields = {
    provider: assessment.provider,
    sourceId: assessment.sourceId,
    displayRights: assessment.displayRights,
    status: assessment.status,
    customerFacing: assessment.customerFacing,
  };
  if (assessment.status === 'cleared_external_display') {
    logger.info('history.display_license.cleared', fields);
    return;
  }
  if (assessment.customerFacing) {
    logger.error('history.display_license.requires_commercial_clearance', {
      ...fields,
      detail:
        "This deployment shows provider market data to customers, and the plan's external " +
        'display rights are not recorded as cleared. Set MARKET_HISTORY_DISPLAY_RIGHTS=external ' +
        'only once a commercial agreement genuinely covers customer-facing display. Execution ' +
        'and risk are unaffected.',
    });
    return;
  }
  logger.warn('history.display_license.development_only', fields);
}
