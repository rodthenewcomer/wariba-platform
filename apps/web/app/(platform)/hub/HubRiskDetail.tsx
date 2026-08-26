'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Dialog, EvidencePanel, buttonClassNames } from '@wariba/ui';
import { trackEvent } from '../../../lib/analytics';
import { helpLinkForReasonCode } from '../../../lib/help-links';
import type { AccountRiskViolation } from '@wariba/application';

export interface HubRiskDetailProps {
  triggerLabel: string;
  violation: AccountRiskViolation;
  timestampLabel: string;
  /** The account this decision was recorded against, for the contestation path. */
  accountId: string;
}

/**
 * UX Architecture §23.4 — clicking the Risk Ribbon opens the rule/calculation
 * detail.
 *
 * Phase 3.2 fills in the `appealAction` slot `EvidencePanel` has carried since
 * Phase 1. Design System §25.9 and Rulebook §4.5 require that every restriction
 * show its rule, threshold, observed value, timestamp and consequence *plus a
 * way to contest it* — the first five have been rendered here since the panel
 * existed; the sixth had nowhere to lead until now.
 */
export function HubRiskDetail({
  triggerLabel,
  violation,
  timestampLabel,
  accountId,
}: HubRiskDetailProps) {
  const [open, setOpen] = useState(false);
  const helpLink = helpLinkForReasonCode(violation.ruleCode);

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setOpen(true);
          trackEvent('risk_detail_opened', { ruleCode: violation.ruleCode });
        }}
      >
        {triggerLabel}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Détail du risque">
        <EvidencePanel
          ruleCode={violation.ruleCode}
          ruleLabel={violation.ruleLabel}
          thresholdFormatted={violation.thresholdFormatted}
          observedValueFormatted={violation.observedFormatted}
          timestampLabel={timestampLabel}
          events={[]}
          consequence={
            violation.consequence === 'hard_breach'
              ? 'Le compte est terminé selon cette règle.'
              : 'Blocage temporaire jusqu’au prochain reset.'
          }
          appealAction={
            <div className="flex flex-wrap gap-2">
              {/*
               * Content master §12 — a reason code offers its own explanation.
               *
               * The alternative is a local sentence written beside the risk
               * panel, which becomes the fifth place the daily-loss rule is
               * described and the first one to go stale. `helpLinkForReasonCode`
               * resolves the rule to the article that owns it, or to nothing.
               */}
              {helpLink ? (
                <Link
                  href={helpLink.href}
                  data-testid="risk-detail-help-link"
                  className={buttonClassNames({ size: 'sm', variant: 'secondary' })}
                  onClick={() => trackEvent('help_article_viewed', { from: 'risk_detail' })}
                >
                  Comprendre cette règle
                </Link>
              ) : null}
              <Link
                href={`/support/contestations/nouvelle?account=${accountId}`}
                className={buttonClassNames({ size: 'sm', variant: 'secondary' })}
                onClick={() => trackEvent('support_opened', { from: 'risk_detail' })}
              >
                Contester cette décision
              </Link>
            </div>
          }
        />
      </Dialog>
    </>
  );
}
