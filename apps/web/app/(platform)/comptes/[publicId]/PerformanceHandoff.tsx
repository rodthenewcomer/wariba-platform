import Link from 'next/link';
import { Alert } from '@wariba/ui';
import type {
  EvaluationPerformanceHandoffStage,
  EvaluationToPerformanceHandoffDTO,
  RuleComparisonItem,
} from '@wariba/application';
import { ActionLink } from '../../../../components/hub/Action';
import { HubIcon } from '../../../../components/hub/icons';
import { StatusPill } from '../../../../components/hub/StatusPill';
import { Surface, SurfaceTitle } from '../../../../components/hub/Surface';
import { PerformanceAcknowledgementForm } from './PerformanceAcknowledgementForm';

const STAGE_COPY: Record<
  EvaluationPerformanceHandoffStage,
  { eyebrow: string; title: string; description: string }
> = {
  objective_reached: {
    eyebrow: 'Objectif atteint pour le moment',
    title: 'Votre évaluation n’est pas encore terminée.',
    description:
      'Continuez à respecter les règles jusqu’à la clôture de la journée. Le compte reste négociable.',
  },
  finalizing: {
    eyebrow: 'Vérification en cours',
    title: 'Votre journée est terminée.',
    description:
      'WARIBA vérifie maintenant toutes les conditions de votre évaluation. Vous n’avez rien à faire.',
  },
  evaluation_passed: {
    eyebrow: 'Évaluation réussie',
    title: 'Toutes les conditions ont été validées.',
    description: 'Votre résultat est enregistré. Le compte Performance va être préparé.',
  },
  performance_provisioning: {
    eyebrow: 'Évaluation réussie',
    title: 'Votre compte Performance est toujours en préparation.',
    description:
      'Vous n’avez rien à faire. Votre évaluation reste réussie et aucun second compte ne sera créé.',
  },
  rules_onboarding: {
    eyebrow: 'Votre compte est prêt',
    title: 'Bienvenue dans WARIBA Performance.',
    description: 'Avant votre premier trade, prenez connaissance des règles attachées à ce compte.',
  },
  performance_ready: {
    eyebrow: 'Compte Performance prêt',
    title: 'Vous pouvez maintenant ouvrir WariX.',
    description: 'Le terminal s’ouvrira directement avec votre nouveau compte Performance.',
  },
};

function formatNominal(amount: string, currency: string): string {
  return `${Number.parseFloat(amount).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${currency}`;
}

function RuleValue({ applicable, value }: { applicable: boolean; value: string | null }) {
  return applicable ? (
    <span className="wariba-data font-medium text-[color:var(--wariba-text-primary)]">{value}</span>
  ) : (
    <span className="text-[color:var(--wariba-text-tertiary)]">Non applicable</span>
  );
}

/**
 * On a phone the Performance column is the answer; the ONE column is only
 * needed when Performance drops the rule entirely, and then the honest thing
 * to show is that it no longer applies.
 */
function PerformanceSide({ row }: { row: RuleComparisonItem }) {
  return row.performance.applicable ? (
    <span className="wariba-data font-semibold text-[color:var(--wariba-text-primary)]">
      {row.performance.displayValue}
    </span>
  ) : (
    <span className="text-[color:var(--wariba-text-tertiary)]">Ne s’applique plus</span>
  );
}

function RuleComparison({ handoff }: { handoff: EvaluationToPerformanceHandoffDTO }) {
  if (handoff.ruleComparison.length === 0) return null;
  const introduced = handoff.ruleComparison.filter((row) => row.group === 'new');
  const unchanged = handoff.ruleComparison.filter((row) => row.group === 'unchanged');
  return (
    <section aria-labelledby="rule-comparison-title" data-testid="performance-rule-comparison">
      <div className="mb-3">
        <h2
          id="rule-comparison-title"
          className="text-[length:var(--wariba-font-size-heading-sm)] font-semibold text-[color:var(--wariba-text-primary)]"
        >
          Ce qui change après WARIBA ONE
        </h2>
        <p className="mt-1 max-w-[68ch] text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
          Cette comparaison vient des deux versions de règles attachées à vos comptes.
        </p>
      </div>

      <div className="hidden overflow-hidden rounded-[12px] border border-[color:var(--warix-border-subtle)] md:block">
        <table className="w-full table-fixed border-collapse text-left text-[length:var(--wariba-font-size-body-sm)]">
          <thead className="bg-[color:var(--warix-surface-raised)] text-[color:var(--wariba-text-tertiary)]">
            <tr>
              <th className="w-[34%] px-4 py-3 font-medium" scope="col">
                Règle
              </th>
              <th className="w-[33%] px-4 py-3 font-medium" scope="col">
                WARIBA ONE
              </th>
              <th className="w-[33%] px-4 py-3 font-medium" scope="col">
                Performance
              </th>
            </tr>
          </thead>
          <tbody>
            {handoff.ruleComparison.map((row) => (
              <tr key={row.key} className="border-t border-[color:var(--warix-border-subtle)]">
                <th
                  className="px-4 py-3 font-medium text-[color:var(--wariba-text-secondary)]"
                  scope="row"
                >
                  {row.label}
                </th>
                <td className="px-4 py-3">
                  <RuleValue
                    applicable={row.evaluation.applicable}
                    value={row.evaluation.displayValue}
                  />
                </td>
                <td className="px-4 py-3">
                  <RuleValue
                    applicable={row.performance.applicable}
                    value={row.performance.displayValue}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-5 md:hidden">
        {introduced.length > 0 ? (
          <div data-testid="performance-rules-new">
            <h3 className="text-[length:var(--wariba-font-size-label-md)] font-semibold uppercase tracking-[0.08em] text-[color:var(--wariba-accent-emerald)]">
              Nouveau en Performance
            </h3>
            <dl className="mt-3 grid gap-2">
              {introduced.map((row) => (
                <div
                  key={row.key}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-[10px] border border-[color:var(--warix-border-subtle)] p-3.5"
                >
                  <dt className="font-medium text-[color:var(--wariba-text-primary)]">
                    {row.label}
                  </dt>
                  <dd className="text-[length:var(--wariba-font-size-body-sm)]">
                    <PerformanceSide row={row} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {unchanged.length > 0 ? (
          <div data-testid="performance-rules-unchanged">
            <h3 className="text-[length:var(--wariba-font-size-label-md)] font-semibold uppercase tracking-[0.08em] text-[color:var(--wariba-text-tertiary)]">
              Ce qui reste identique
            </h3>
            <dl className="mt-3 grid gap-0 rounded-[10px] border border-[color:var(--warix-border-subtle)] px-3.5">
              {unchanged.map((row) => (
                <div
                  key={row.key}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[color:var(--warix-border-subtle)] py-3 last:border-0"
                >
                  <dt className="text-[color:var(--wariba-text-secondary)]">{row.label}</dt>
                  <dd>
                    <PerformanceSide row={row} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * A9 — four phases, not one queue.
 *
 * Only phase one can carry a checkmark here: the account exists and, once the
 * rules are acknowledged, it can trade. Everything below is either a condition
 * nothing has measured yet or work WARIBA has not started, and marking those
 * would be a prediction dressed as a fact.
 */
function PayoutPath({ handoff }: { handoff: EvaluationToPerformanceHandoffDTO }) {
  if (handoff.payoutPath.length === 0) return null;
  return (
    <Surface className="p-5 sm:p-6" data-testid="performance-payout-path">
      <SurfaceTitle>Votre chemin vers un payout</SurfaceTitle>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        {handoff.payoutPath.map((phase, phaseIndex) => (
          <section key={phase.key} data-payout-phase={phase.key}>
            <h3 className="flex items-baseline gap-2 text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)]">
              <span className="wariba-data text-[color:var(--wariba-text-tertiary)]">
                {phaseIndex + 1}
              </span>
              {phase.title}
            </h3>
            <ul className="mt-2 grid gap-1.5">
              {phase.steps.map((step) => (
                <li
                  key={step.key}
                  className="flex items-start gap-2.5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] leading-none"
                    style={
                      step.done
                        ? {
                            background: 'var(--wariba-accent-emerald)',
                            color: 'var(--wariba-color-ink-950)',
                          }
                        : { border: '1px solid var(--warix-border-strong)', color: 'transparent' }
                    }
                  >
                    ✓
                  </span>
                  <span
                    className={step.done ? 'text-[color:var(--wariba-text-primary)]' : undefined}
                  >
                    {step.label}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Surface>
  );
}

/**
 * A3 — a successful evaluation, seen from the other side.
 *
 * Once the Performance account exists and its rules have been read, the
 * evaluation is history: it cannot be traded, its budgets are no longer being
 * spent, and the only thing a trader needs from it is the result and the way
 * through to the account that replaced it. Rendering its live risk budgets and
 * an objective progress bar told them the opposite.
 */
export function EvaluationArchive({ handoff }: { handoff: EvaluationToPerformanceHandoffDTO }) {
  const evaluation = handoff.evaluationAccount;
  const performance = handoff.performanceAccount;
  const passedAt = handoff.timeline.find((event) => event.key === 'passed');

  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-5"
      data-testid="evaluation-archive"
      data-account-tradable="false"
    >
      <Surface tone="emerald" className="flex flex-col gap-4 p-6 sm:p-8">
        <div className="flex items-center gap-3 text-[color:var(--wariba-accent-emerald)]">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--wariba-accent-emerald-wash)]"
          >
            <HubIcon role="success" size={20} active />
          </span>
          <p className="text-[length:var(--wariba-font-size-label-md)] font-bold uppercase tracking-[0.09em]">
            Évaluation réussie
          </p>
        </div>
        <div>
          <p className="wariba-data text-[length:var(--wariba-font-size-heading-md)] font-semibold text-[color:var(--wariba-text-primary)]">
            {evaluation.publicId}
          </p>
          {passedAt ? (
            <p className="wariba-data mt-1 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-tertiary)]">
              Terminée le {passedAt.timestampLabel}
            </p>
          ) : null}
        </div>
        {evaluation.finalResultFormatted ? (
          <div className="border-t border-[color:var(--warix-border-subtle)] pt-4">
            <p className="text-[length:var(--wariba-font-size-label-sm)] uppercase tracking-[0.08em] text-[color:var(--wariba-text-tertiary)]">
              Résultat final
            </p>
            <p
              className="wariba-data mt-1 text-[length:var(--wariba-font-size-heading-lg)] font-bold text-[color:var(--wariba-accent-emerald)]"
              data-testid="evaluation-final-result"
            >
              {evaluation.finalResultFormatted}
            </p>
          </div>
        ) : null}
      </Surface>

      {performance ? (
        <Surface className="flex flex-col gap-4 p-5 sm:p-6" data-testid="evaluation-successor">
          <SurfaceTitle>A donné naissance à</SurfaceTitle>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[length:var(--wariba-font-size-label-sm)] uppercase tracking-[0.08em] text-[color:var(--wariba-text-tertiary)]">
                WARIBA Performance
              </p>
              <p className="wariba-data mt-1 text-[length:var(--wariba-font-size-heading-sm)] font-semibold text-[color:var(--wariba-text-primary)]">
                {performance.publicId}
              </p>
              <p className="wariba-data mt-1 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
                {formatNominal(performance.nominalAmount, performance.currency)}
              </p>
            </div>
            <StatusPill tone={performance.tradable ? 'success' : 'progress'}>
              {performance.statusLabel}
            </StatusPill>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionLink href={`/hub?account=${performance.id}`} icon="chevron">
              Voir mon compte Performance
            </ActionLink>
            <ActionLink
              href={`/comptes/${evaluation.publicId}/bienvenue-performance`}
              variant="ghost"
            >
              Voir l’historique de l’évaluation
            </ActionLink>
          </div>
        </Surface>
      ) : null}
    </div>
  );
}

export function PerformanceHandoff({
  handoff,
  error,
}: {
  handoff: EvaluationToPerformanceHandoffDTO;
  error?: string;
}) {
  const copy = STAGE_COPY[handoff.stage];
  const performance = handoff.performanceAccount;
  const ready = handoff.stage === 'performance_ready';
  const onboarding = handoff.stage === 'rules_onboarding';

  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-col gap-6"
      data-testid="performance-handoff"
      data-stage={handoff.stage}
    >
      {error ? (
        <Alert level="warning" title="Confirmation non enregistrée">
          {error === 'confirmation'
            ? 'Cochez la case après avoir pris connaissance des règles.'
            : 'La confirmation n’a pas pu être enregistrée. Vérifiez l’état du compte puis réessayez.'}
        </Alert>
      ) : null}

      <Surface tone={ready || onboarding ? 'emerald' : 'cyan'} className="overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1fr_19rem]">
          <div className="flex flex-col justify-center p-5 sm:p-8 lg:p-10">
            <div className="flex items-center gap-3 text-[color:var(--wariba-accent-emerald)]">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--wariba-accent-emerald-wash)]"
              >
                <HubIcon
                  role={handoff.stage === 'finalizing' ? 'pending' : 'success'}
                  size={22}
                  active
                />
              </span>
              <p className="text-[length:var(--wariba-font-size-label-md)] font-bold uppercase tracking-[0.09em]">
                {copy.eyebrow}
              </p>
            </div>
            {/*
             * A17 — the headline gives way to the decision on a small screen.
             *
             * At 320 px the display size pushed "Ouvrir WariX" 105 px below
             * the fold, which is the same failure as burying it under the
             * rule tables, just prettier.
             */}
            <h1 className="mt-4 max-w-[20ch] text-[length:var(--wariba-font-size-heading-md)] font-bold leading-[1.08] tracking-[-0.02em] text-[color:var(--wariba-text-primary)] sm:mt-5 sm:text-[length:var(--wariba-font-size-heading-xl)] sm:leading-[1.06] sm:tracking-[-0.03em]">
              {copy.title}
            </h1>
            <p className="mt-3 max-w-[60ch] text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)] sm:mt-4 sm:text-[length:var(--wariba-font-size-body-md)]">
              {copy.description}
            </p>

            {/*
             * A17 — the decision lives in the first viewport.
             *
             * Inside the hero's own column, not after the hero: below `lg` the
             * account rail stacks underneath, so a sibling placement put
             * "Ouvrir WariX" 105 px below the fold at 320 px — the same
             * failure as burying it under the rule tables, only prettier.
             */}
            {ready && performance ? (
              <div
                className="mt-5 flex flex-col gap-2.5 sm:mt-7 sm:flex-row sm:items-center"
                data-testid="performance-ready-actions"
              >
                <ActionLink href={`/trade?account=${performance.id}`} icon="warix" size="lg">
                  Ouvrir WariX
                </ActionLink>
                <ActionLink
                  href={`/comptes/${performance.publicId}/regles`}
                  variant="secondary"
                  size="lg"
                >
                  Voir mes règles
                </ActionLink>
              </div>
            ) : null}
          </div>

          <div className="border-t border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-surface-raised)] p-6 lg:border-l lg:border-t-0 lg:p-7">
            <p className="text-[length:var(--wariba-font-size-label-sm)] uppercase tracking-[0.08em] text-[color:var(--wariba-text-tertiary)]">
              {performance ? 'WARIBA Performance' : 'WARIBA ONE'}
            </p>
            <p className="wariba-data mt-2 text-[length:var(--wariba-font-size-heading-md)] font-semibold text-[color:var(--wariba-text-primary)]">
              {performance?.publicId ?? handoff.evaluationAccount.publicId}
            </p>
            <p className="wariba-data mt-1 text-[length:var(--wariba-font-size-body-md)] text-[color:var(--wariba-text-secondary)]">
              {formatNominal(
                performance?.nominalAmount ?? handoff.evaluationAccount.nominalAmount,
                performance?.currency ?? handoff.evaluationAccount.currency,
              )}
            </p>
            <div className="mt-5">
              <StatusPill tone={performance?.tradable ? 'success' : 'progress'}>
                {performance?.statusLabel ?? handoff.evaluationAccount.statusLabel}
              </StatusPill>
            </div>
            {performance ? (
              <p className="mt-5 border-t border-[color:var(--warix-border-subtle)] pt-4 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                Issu de{' '}
                <Link
                  className="wariba-data underline-offset-4 hover:underline"
                  href={`/hub?account=${handoff.evaluationAccount.id}`}
                >
                  {handoff.evaluationAccount.publicId}
                </Link>
              </p>
            ) : null}
          </div>
        </div>
      </Surface>

      {handoff.stage === 'objective_reached' || handoff.stage === 'finalizing' ? (
        <Surface className="p-5 sm:p-6">
          <SurfaceTitle>Étapes de validation</SurfaceTitle>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {['Objectif atteint', 'Journée clôturée', 'Évaluation validée'].map((label, index) => {
              const complete = handoff.stage === 'finalizing' ? index < 2 : index === 0;
              return (
                <li
                  key={label}
                  className="flex items-center gap-3 text-[length:var(--wariba-font-size-body-sm)]"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--warix-surface-raised)]"
                  >
                    {complete ? '✓' : index + 1}
                  </span>
                  <span
                    className={
                      complete
                        ? 'text-[color:var(--wariba-text-primary)]'
                        : 'text-[color:var(--wariba-text-tertiary)]'
                    }
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </Surface>
      ) : null}

      {performance ? (
        <>
          <RuleComparison handoff={handoff} />

          <div className="grid gap-5 lg:grid-cols-2">
            {handoff.buffer ? (
              <Surface className="p-5 sm:p-6" data-testid="performance-buffer">
                <SurfaceTitle>Le buffer permanent</SurfaceTitle>
                <p className="mt-3 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
                  Le buffer reste dans votre compte. Seule la partie autorisée au-dessus du seuil
                  peut être demandée.
                </p>
                <div className="mt-5 overflow-hidden rounded-[10px] border border-[color:var(--warix-border-subtle)]">
                  <div className="h-2 bg-[color:var(--wariba-accent-indigo)]" />
                  <dl className="grid grid-cols-2 gap-4 p-4">
                    <div>
                      <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                        Buffer
                      </dt>
                      <dd className="wariba-data mt-1 font-semibold">
                        {handoff.buffer.rateFormatted} · {handoff.buffer.amountFormatted}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                        Seuil du buffer
                      </dt>
                      <dd className="wariba-data mt-1 font-semibold">
                        {handoff.buffer.floorFormatted}
                      </dd>
                    </div>
                  </dl>
                </div>
              </Surface>
            ) : null}

            <PayoutPath handoff={handoff} />
          </div>

          <Surface className="p-5 sm:p-6" data-testid="performance-rules-list">
            <SurfaceTitle>Règles de votre compte</SurfaceTitle>
            <dl className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {handoff.performanceRules.map((rule) => (
                <div key={rule.key}>
                  <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                    {rule.label}
                  </dt>
                  <dd className="mt-1">
                    <span className="wariba-data font-semibold text-[color:var(--wariba-text-primary)]">
                      {rule.displayValue}
                    </span>
                    <span className="mt-1 block text-[length:var(--wariba-font-size-label-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
                      {rule.explanation}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="wariba-data mt-5 border-t border-[color:var(--warix-border-subtle)] pt-4 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
              Version attachée : {performance.policyVersion}
            </p>
          </Surface>

          {onboarding ? (
            <PerformanceAcknowledgementForm accountPublicId={performance.publicId} />
          ) : null}
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <ActionLink
            href={`/comptes/${handoff.evaluationAccount.publicId}/bienvenue-performance`}
            variant="secondary"
          >
            Actualiser
          </ActionLink>
          <ActionLink
            href={`/support/nouveau?account=${handoff.evaluationAccount.id}`}
            variant="ghost"
          >
            Contacter le support
          </ActionLink>
        </div>
      )}

      {handoff.timeline.length > 0 ? (
        <Surface className="p-5 sm:p-6" data-testid="performance-timeline">
          <SurfaceTitle>Historique du passage</SurfaceTitle>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {handoff.timeline.map((event) => (
              <li
                key={event.key}
                className="border-l-2 border-[color:var(--wariba-accent-emerald)] pl-3"
              >
                <p className="text-[length:var(--wariba-font-size-body-sm)] font-medium">
                  {event.label}
                </p>
                <time
                  className="wariba-data mt-1 block text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]"
                  dateTime={event.occurredAt}
                >
                  {event.timestampLabel}
                </time>
              </li>
            ))}
          </ol>
        </Surface>
      ) : null}
    </div>
  );
}
