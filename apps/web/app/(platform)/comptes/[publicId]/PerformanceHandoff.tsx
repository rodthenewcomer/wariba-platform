import Link from 'next/link';
import { Alert, Button } from '@wariba/ui';
import type {
  EvaluationPerformanceHandoffStage,
  EvaluationToPerformanceHandoffDTO,
} from '@wariba/application';
import { ActionLink } from '../../../../components/hub/Action';
import { HubIcon } from '../../../../components/hub/icons';
import { StatusPill } from '../../../../components/hub/StatusPill';
import { Surface, SurfaceTitle } from '../../../../components/hub/Surface';
import { acknowledgePerformanceRulesAction } from './actions';

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

function RuleComparison({ handoff }: { handoff: EvaluationToPerformanceHandoffDTO }) {
  if (handoff.ruleComparison.length === 0) return null;
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

      <dl className="grid gap-2 md:hidden">
        {handoff.ruleComparison.map((row) => (
          <div
            key={row.key}
            className="rounded-[10px] border border-[color:var(--warix-border-subtle)] p-4"
          >
            <dt className="font-semibold text-[color:var(--wariba-text-primary)]">{row.label}</dt>
            <dd className="mt-3 grid grid-cols-2 gap-3 text-[length:var(--wariba-font-size-label-sm)]">
              <span className="flex flex-col gap-1">
                <span className="text-[color:var(--wariba-text-tertiary)]">ONE</span>
                <RuleValue
                  applicable={row.evaluation.applicable}
                  value={row.evaluation.displayValue}
                />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-[color:var(--wariba-text-tertiary)]">Performance</span>
                <RuleValue
                  applicable={row.performance.applicable}
                  value={row.performance.displayValue}
                />
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
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
          <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
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
            <h1 className="mt-5 max-w-[20ch] text-[length:var(--wariba-font-size-heading-xl)] font-bold leading-[1.06] tracking-[-0.03em] text-[color:var(--wariba-text-primary)]">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-[60ch] text-[length:var(--wariba-font-size-body-md)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
              {copy.description}
            </p>
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
                  Le buffer reste dans votre compte. Seul le montant autorisé au-dessus du niveau
                  protégé peut être demandé.
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
                        Niveau protégé
                      </dt>
                      <dd className="wariba-data mt-1 font-semibold">
                        {handoff.buffer.floorFormatted}
                      </dd>
                    </div>
                  </dl>
                </div>
              </Surface>
            ) : null}

            <Surface className="p-5 sm:p-6" data-testid="performance-payout-path">
              <SurfaceTitle>Votre chemin vers un payout</SurfaceTitle>
              <ol className="mt-4 grid gap-0">
                {handoff.payoutPath.map((step, index) => (
                  <li key={step.key} className="relative flex min-h-11 gap-3 pb-3 last:pb-0">
                    {index < handoff.payoutPath.length - 1 ? (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0 left-[13px] top-7 w-px bg-[color:var(--warix-border-subtle)]"
                      />
                    ) : null}
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[color:var(--warix-border-strong)] bg-[color:var(--warix-surface-raised)] text-[length:var(--wariba-font-size-label-sm)]"
                    >
                      {index === 0 ? '✓' : index + 1}
                    </span>
                    <span className="pt-1 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
                      {step.label}
                    </span>
                  </li>
                ))}
              </ol>
            </Surface>
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
            <form
              action={acknowledgePerformanceRulesAction}
              className="rounded-[14px] border border-[color:var(--wariba-accent-emerald-edge)] bg-[color:var(--wariba-accent-emerald-wash)] p-5 sm:p-6"
              data-testid="performance-rules-acknowledgement"
            >
              <input type="hidden" name="accountPublicId" value={performance.publicId} />
              <label className="flex cursor-pointer items-start gap-3 text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)]">
                <input
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[color:var(--wariba-accent-indigo)]"
                  type="checkbox"
                  name="acknowledged"
                  value="yes"
                  required
                />
                <span>J’ai pris connaissance des règles de mon compte WARIBA Performance.</span>
              </label>
              <Button
                type="submit"
                className="mt-5 min-h-11"
                data-testid="performance-rules-submit"
              >
                Continuer vers mon compte Performance
              </Button>
            </form>
          ) : null}

          {ready ? (
            <div
              className="flex flex-col gap-3 rounded-[14px] border border-[color:var(--wariba-accent-emerald-edge)] bg-[color:var(--wariba-accent-emerald-wash)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
              data-testid="performance-ready-actions"
            >
              <div>
                <p className="font-semibold text-[color:var(--wariba-text-primary)]">
                  Votre compte WARIBA Performance est prêt.
                </p>
                <p className="mt-1 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
                  WariX utilisera {performance.publicId}.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionLink href={`/trade?account=${performance.id}`} icon="warix">
                  Ouvrir WariX
                </ActionLink>
                <ActionLink href={`/comptes/${performance.publicId}/regles`} variant="secondary">
                  Voir mes règles
                </ActionLink>
              </div>
            </div>
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
        <Surface className="p-5 sm:p-6">
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
