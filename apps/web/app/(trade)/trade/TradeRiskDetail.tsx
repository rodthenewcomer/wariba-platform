'use client';

import { useState } from 'react';
import { BottomSheet, Text } from '@wariba/ui';
import type { AccountRisk } from '@wariba/contracts';

export interface TradeRiskDetailProps {
  risk: AccountRisk;
  /**
   * Visible trigger text. The workstation status bar shortens it at phone
   * widths (W2 §25); the accessible name always carries the full meaning.
   */
  triggerLabel?: import('react').ReactNode;
  triggerClassName?: string;
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
export function TradeRiskDetail({
  risk,
  triggerLabel = 'Détail des règles',
  triggerClassName,
}: TradeRiskDetailProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Détail des règles de risque"
        className={
          triggerClassName ??
          'text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)] underline decoration-dotted underline-offset-2'
        }
      >
        {triggerLabel}
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Détail du risque">
        <div className="flex flex-col gap-4">
          <div>
            <Text variant="label-sm" color="tertiary" className="mb-1">
              Progression du programme
            </Text>
            <div className="flex flex-col divide-y divide-[color:var(--wariba-border-subtle)]">
              {row('Solde éligible', `${risk.programEligibleBalance} USD`)}
              {row('Valeur éligible', `${risk.programEligibleEquity} USD`)}
              {row('Progression vers la cible', `${risk.target.current} USD`)}
              {row('Cible requise', `${risk.target.required} USD`)}
              {row(
                'Clôtures profitables < 60 s (24 h)',
                `${risk.shortDurationMonitoring.count24h}`,
              )}
            </div>
          </div>

          <div>
            <Text variant="label-sm" color="tertiary" className="mb-1">
              Perte quotidienne
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
              Perte maximale
            </Text>
            <div className="flex flex-col divide-y divide-[color:var(--wariba-border-subtle)]">
              {row('Plancher de protection', `${risk.maximumLoss.floor} USD`)}
              {row('Restant avant dépassement', `${risk.maximumLoss.remaining} USD`)}
            </div>
          </div>

          {risk.grossExposure ? (
            <div>
              <Text variant="label-sm" color="tertiary" className="mb-1">
                Exposition totale
              </Text>
              <div className="flex flex-col divide-y divide-[color:var(--wariba-border-subtle)]">
                {row('Exposition actuelle', `${risk.grossExposure.grossExposure} USD`)}
                {row('Exposition maximale', `${risk.grossExposure.maximumGrossExposure} USD`)}
              </div>
              <Text variant="body-sm" color="tertiary" className="mt-2">
                WARIBA limite automatiquement la taille totale de vos positions. Les positions
                opposées utilisent elles aussi de l’exposition.
              </Text>
            </div>
          ) : null}

          {risk.margin ? (
            <div>
              <Text variant="label-sm" color="tertiary" className="mb-1">
                Marge
              </Text>
              <div className="flex flex-col divide-y divide-[color:var(--wariba-border-subtle)]">
                {row('Marge utilisée', `${risk.margin.requiredMargin} USD`)}
              </div>
            </div>
          ) : null}

          <Text variant="body-sm" color="tertiary">
            Ces chiffres sont calculés côté serveur à chaque ordre. Les profits nets positifs issus
            d’une clôture sous 60 secondes restent dans la balance réelle mais sont exclus des
            calculs de progression. Le soft lock quotidien se réinitialise à 00:00 UTC ; le verrou
            de courte durée suit la fenêtre glissante de 24 h. Aucun de ces blocages n’efface une
            position existante.
          </Text>
        </div>
      </BottomSheet>
    </>
  );
}
