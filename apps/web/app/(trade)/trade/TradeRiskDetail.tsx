'use client';

import { useState } from 'react';
import { BottomSheet, Text } from '@wariba/ui';
import type { AccountRisk } from '@wariba/contracts';

export interface TradeRiskDetailProps {
  risk: AccountRisk;
}

function row(label: string, value: string) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <Text variant="body-sm" color="secondary">
        {label}
      </Text>
      <Text variant="body-sm" className="wariba-data font-medium">
        {value}
      </Text>
    </div>
  );
}

/**
 * UX Architecture §23.4 — "Un clic ouvre le détail des règles et des
 * calculs." The RiskRibbon summary is already fully server-computed
 * (services/realtime's buildAccountRisk); this just lays out the same
 * numbers it's already carrying — no client-side math, matching Design
 * System §48 like RiskRibbon itself. Uses BottomSheet (§24.13's "détail
 * rapide" — desktop, not just mobile), never Dialog, since Dialog is
 * reserved for decisions that require interruption.
 */
export function TradeRiskDetail({ risk }: TradeRiskDetailProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)] underline decoration-dotted underline-offset-2"
      >
        Détail des règles
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Détail du risque">
        <div className="flex flex-col gap-4">
          <div>
            <Text variant="label-sm" color="tertiary" className="mb-1">
              Perte quotidienne (DLL)
            </Text>
            <div className="flex flex-col divide-y divide-[color:var(--wariba-border-subtle)]">
              {row('Référence du jour', `${risk.dailyLoss.reference} USD`)}
              {row('Plancher', `${risk.dailyLoss.floor} USD`)}
              {row('Utilisé aujourd’hui', `${risk.dailyLoss.used} USD`)}
              {row('Restant avant blocage', `${risk.dailyLoss.remaining} USD`)}
            </div>
          </div>

          <div>
            <Text variant="label-sm" color="tertiary" className="mb-1">
              Perte maximale (Maximum Loss)
            </Text>
            <div className="flex flex-col divide-y divide-[color:var(--wariba-border-subtle)]">
              {row('Plancher (EOD-trailing)', `${risk.maximumLoss.floor} USD`)}
              {row('Restant avant dépassement', `${risk.maximumLoss.remaining} USD`)}
            </div>
          </div>

          <Text variant="body-sm" color="tertiary">
            Ces chiffres sont calculés côté serveur à chaque ordre et se
            réinitialisent chaque jour à 00:00 UTC. Le blocage temporaire
            (soft lock) n’efface jamais de position — il empêche seulement
            l’ouverture de nouvelles positions jusqu’au reset.
          </Text>
        </div>
      </BottomSheet>
    </>
  );
}
