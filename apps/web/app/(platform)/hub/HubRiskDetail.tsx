'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Dialog, EvidencePanel, buttonClassNames } from '@wariba/ui';
import { trackEvent } from '../../../lib/analytics';
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
            <Link
              href={`/support/contestations/nouvelle?account=${accountId}`}
              className={buttonClassNames({ size: 'sm', variant: 'secondary' })}
              onClick={() => trackEvent('support_opened', { from: 'risk_detail' })}
            >
              Contester cette décision
            </Link>
          }
        />
      </Dialog>
    </>
  );
}
