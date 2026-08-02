import {
  AccountContext,
  Alert,
  EmptyState,
  MissionProgress,
  PolicyVersionChip,
  RiskRibbon,
  Text,
  buttonClassNames,
} from '@wariba/ui';
import Link from 'next/link';

export default function HubPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Alert level="information" title="Aucun compte réel — shell de fondation">
        Ce Hub affiche la structure visuelle avec des données DEMO explicites. La création de
        compte, l&apos;activation et la Mission réelle arrivent avec Prompt 03 et Prompt 06.
      </Alert>

      <AccountContext
        program="WARIBA ONE"
        nominalFormatted="10 000 USD"
        publicId="DEMO-10K-001"
        statusLabel="Actif"
        statusVariant="success"
      />

      <div className="flex items-center justify-between">
        <Text as="h1" variant="heading-lg">
          Votre mission
        </Text>
        <PolicyVersionChip version="1.0.0" status="draft" effectiveDateLabel="non publiée" />
      </div>

      <RiskRibbon
        status="normal"
        dailyLossRemaining="400 USD"
        maximumLossRemaining="800 USD"
        nextResetLabel="00:00 UTC"
        connectionOk
      />

      <MissionProgress
        variant="evaluation"
        state="active"
        title="Objectif WARIBA ONE — 10 000 USD"
        progressPercent={51}
        conditions={[
          { label: 'Objectif de profit (8 %)', detail: '408 / 800 USD', met: false },
          { label: 'Jours de trading (min. 4)', detail: '2 / 4', met: false },
          { label: 'Journées qualifiées (min. 3)', detail: '1 / 3', met: false },
          { label: 'Consistance (≤ 40 %)', detail: '28 %', met: true },
        ]}
        nextAction={
          <div className="flex items-center justify-between gap-4">
            <Text variant="body-sm" color="secondary">
              Prochaine action : continuer à trader jusqu&apos;à l&apos;objectif.
            </Text>
            <Link href="/trade" className={buttonClassNames({ size: 'sm' })}>
              Ouvrir Trade
            </Link>
          </div>
        }
      />

      <div>
        <Text as="h2" variant="heading-sm" className="mb-3">
          Activité récente
        </Text>
        <EmptyState
          title="Aucun trade pour l'instant"
          description="Votre historique apparaîtra ici après votre première exécution."
          action={
            <Link href="/trade" className={buttonClassNames({ variant: 'secondary' })}>
              Ouvrir Trade
            </Link>
          }
        />
      </div>
    </div>
  );
}
