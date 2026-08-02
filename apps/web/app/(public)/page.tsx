import {
  Badge,
  buttonClassNames,
  ConsistencyMeter,
  MissionProgress,
  RiskRibbon,
  Text,
} from '@wariba/ui';
import Link from 'next/link';

const STEPS = [
  {
    title: 'Choisissez une taille',
    body: 'WARIBA ONE : 5K, 10K ou 25K USD simulés. Une seule phase, un objectif clair, aucun frais d’activation.',
  },
  {
    title: 'Démontrez votre discipline',
    body: 'Tradez cinq instruments dans des limites de risque publiques. Le serveur exécute et calcule tout — jamais votre navigateur.',
  },
  {
    title: 'Progressez vers Performance',
    body: 'Après réussite, un compte Performance simulé s’ouvre pour des cycles de payout décomposés en détail.',
  },
] as const;

const RULES = [
  { label: 'Objectif de profit', value: '8 %' },
  { label: 'Limite de perte quotidienne', value: '4 %' },
  { label: 'Perte maximale', value: '8 %, statique' },
  { label: 'Consistance', value: '≤ 40 %, jamais un breach' },
] as const;

export default function HomePage() {
  return (
    <>
      <section className="mx-auto max-w-[var(--wariba-size-marketing-container-max)] px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="flex flex-col gap-6">
            <Badge variant="information">Bêta privée en préparation</Badge>
            <Text as="h1" variant="display-lg">
              Une infrastructure de progression pour traders disciplinés.
            </Text>
            <Text variant="body-lg" color="secondary">
              WARIBA évalue votre discipline sur un compte de trading simulé, avec des règles
              publiques et versionnées, une exécution serveur, et un payout entièrement décomposé —
              jamais un chiffre unique.
            </Text>
            <div className="flex flex-wrap gap-3">
              <Link href="/offres" className={buttonClassNames({ size: 'lg' })}>
                Voir les offres
              </Link>
              <Link
                href="/regles"
                className={buttonClassNames({ size: 'lg', variant: 'secondary' })}
              >
                Lire les règles
              </Link>
            </div>
            <Text variant="body-sm" color="tertiary">
              Compte 100% simulé. La taille nominale n&apos;est pas un dépôt vous appartenant.
            </Text>
          </div>

          <div className="flex flex-col gap-4 rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-surface)] p-5 shadow-[var(--wariba-shadow-sm)]">
            <Text variant="label-sm" color="tertiary">
              Aperçu Hub — compte DEMO-10K-001
            </Text>
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
              ]}
              nextAction={
                <Text variant="body-sm" color="secondary">
                  Prochaine action : continuer à trader jusqu&apos;à l&apos;objectif.
                </Text>
              }
            />
          </div>
        </div>
      </section>

      <section className="border-y border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-subtle)]">
        <div className="mx-auto max-w-[var(--wariba-size-marketing-container-max)] px-4 py-16 sm:px-6">
          <Text as="h2" variant="heading-lg" className="mb-10">
            Comment ça fonctionne
          </Text>
          <div className="grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.title} className="flex flex-col gap-2">
                <span className="wariba-data text-[length:var(--wariba-font-size-data-lg)] text-[color:var(--wariba-text-secondary)]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <Text as="h3" variant="heading-sm">
                  {step.title}
                </Text>
                <Text variant="body-sm" color="secondary">
                  {step.body}
                </Text>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[var(--wariba-size-marketing-container-max)] px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <Text as="h2" variant="heading-lg" className="mb-6">
              Les règles essentielles de WARIBA ONE
            </Text>
            <dl className="grid grid-cols-2 gap-6">
              {RULES.map((rule) => (
                <div key={rule.label}>
                  <dt className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
                    {rule.label}
                  </dt>
                  <dd className="wariba-data mt-1 text-[length:var(--wariba-font-size-heading-sm)] font-semibold text-[color:var(--wariba-text-primary)]">
                    {rule.value}
                  </dd>
                </div>
              ))}
            </dl>
            <Text variant="body-sm" color="tertiary" className="mt-6">
              Paramètres candidats, soumis au modèle financier et à la bêta — voir{' '}
              <Link href="/regles" className="text-[color:var(--wariba-text-link)] hover:underline">
                les règles publiques et versionnées
              </Link>
              .
            </Text>
          </div>

          <div className="rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-surface)] p-5">
            <Text variant="label-sm" color="tertiary" className="mb-4 block">
              La consistance n&apos;est jamais une violation
            </Text>
            <ConsistencyMeter
              ratioPercent={47}
              limitPercent={40}
              bestDayFormatted="376 USD"
              totalProfitFormatted="800 USD"
              requiredProfitFormatted="940 USD"
            />
          </div>
        </div>
      </section>

      <section
        data-theme="dark"
        className="border-t border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-canvas)]"
      >
        <div className="mx-auto flex max-w-[var(--wariba-size-marketing-container-max)] flex-col items-start gap-6 px-4 py-16 sm:px-6 sm:py-20">
          <Text as="h2" variant="heading-lg">
            Commencez avec une évaluation transparente.
          </Text>
          <Text variant="body-md" color="secondary" className="max-w-lg">
            Nature simulée, prix en FCFA, et politique de règles versionnée — visibles avant tout
            paiement.
          </Text>
          <Link href="/offres" className={buttonClassNames({ size: 'lg' })}>
            Voir les offres
          </Link>
        </div>
      </section>
    </>
  );
}
