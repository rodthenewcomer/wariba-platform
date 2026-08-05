'use client';

import { useState } from 'react';
import { Button, Dialog, EvidencePanel } from '@wariba/ui';
import { trackEvent } from '../../../lib/analytics';
import type { AccountRiskViolation } from '@wariba/application';

export interface HubRiskDetailProps {
  triggerLabel: string;
  violation: AccountRiskViolation;
  timestampLabel: string;
}

/** UX Architecture §23.4 — clicking the Risk Ribbon opens the rule/calculation detail. */
export function HubRiskDetail({ triggerLabel, violation, timestampLabel }: HubRiskDetailProps) {
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
        />
      </Dialog>
    </>
  );
}
