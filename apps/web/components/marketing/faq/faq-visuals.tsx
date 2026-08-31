/**
 * Section 11's seven contextual micro-visuals — one distinct scene per FAQ
 * row, never a repeated shape. Pure DOM/CSS (dots, thin connector lines,
 * mono labels), the same vocabulary `FlexPaymentTimeline` and Section 09's
 * map already use, so a reader doesn't learn a new visual language just for
 * this section. No canonical numbers here — every answer this section gives
 * is conceptual, so nothing here can drift out of sync with real policy.
 */

const railBase =
  'flex items-center gap-2 font-mono text-[0.62rem] font-bold uppercase tracking-[0.08em]';

function StepDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

function StepConnector() {
  return (
    <span
      aria-hidden="true"
      className="ml-[3px] h-4 w-px shrink-0 bg-[color:var(--wariba-seam-strong)]"
    />
  );
}

/** FAQ 01 — the product flow: WARIBA → WariX → Progression → Performance. */
export function JourneyFlowVisual() {
  const steps = ['WARIBA', 'WARIX', 'PROGRESSION', 'PERFORMANCE'];
  return (
    <div className="flex flex-col gap-0">
      {steps.map((step, index) => (
        <div key={step}>
          <div className={railBase}>
            <StepDot color="var(--wariba-brand-400)" />
            <span className="text-[color:var(--wariba-on-dark)]">{step}</span>
          </div>
          {index < steps.length - 1 ? <StepConnector /> : null}
        </div>
      ))}
    </div>
  );
}

/** FAQ 02 — three pathways branching to (or straight to) Performance. */
export function PathwayBranchVisual() {
  const paths = [
    { label: 'ONE', color: 'var(--wariba-brand-400)', steps: ['Évaluation', 'Performance'] },
    { label: 'FLEX', color: '#B9B2FF', steps: ['Évaluation', 'Activation', 'Performance'] },
    { label: 'INSTANT', color: 'var(--wariba-accent-cyan)', steps: ['Performance'] },
  ] as const;

  return (
    <div className="grid grid-cols-3 gap-4">
      {paths.map((path) => (
        <div key={path.label}>
          <p
            className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.1em]"
            style={{ color: path.color }}
          >
            {path.label}
          </p>
          <div className="mt-3 flex flex-col gap-0">
            {path.steps.map((step, index) => (
              <div key={step}>
                <div className="flex items-center gap-2">
                  <StepDot color={path.color} />
                  <span className="text-[0.68rem] leading-tight text-[color:var(--wariba-on-dark-muted)]">
                    {step}
                  </span>
                </div>
                {index < path.steps.length - 1 ? <StepConnector /> : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** FAQ 03 — a compact Performance account identity, no fake balance. */
export function PerformanceTokenVisual() {
  return (
    <div
      className="inline-flex flex-col gap-1 rounded-2xl border px-5 py-4"
      style={{
        borderColor: 'color-mix(in srgb, var(--wariba-accent-emerald) 35%, var(--wariba-seam-strong))',
        background: 'color-mix(in srgb, var(--wariba-accent-emerald) 8%, transparent)',
      }}
    >
      <p className="font-mono text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[color:var(--wariba-on-dark-dim)]">
        WARIBA
      </p>
      <p className="text-lg font-bold tracking-[-0.02em] text-[color:var(--wariba-on-dark)]">
        Performance
      </p>
      <span className="mt-1 inline-flex w-fit items-center rounded-full border border-[color:var(--wariba-accent-emerald)] px-2.5 py-1 font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[color:var(--wariba-accent-emerald)]">
        Compte simulé
      </span>
    </div>
  );
}

/** FAQ 04 — a nominal simulated size is not a deposit or real capital. */
export function SimulatedDistinctionVisual() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="rounded-full border border-[color:var(--wariba-seam-strong)] bg-[color:var(--wariba-surface-1)] px-3.5 py-2 font-mono text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[color:var(--wariba-on-dark)]">
        Taille nominale
      </span>
      <span aria-hidden="true" className="text-sm font-bold text-[color:var(--wariba-on-dark-dim)]">
        ≠
      </span>
      <span className="rounded-full border border-[color:var(--wariba-seam-strong)] px-3.5 py-2 font-mono text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[color:var(--wariba-on-dark-dim)]">
        Dépôt / capital réel
      </span>
    </div>
  );
}

/** FAQ 05 — reaching the objective still goes through verification. */
export function ValidationTimelineVisual() {
  const steps = ['Objectif', 'Vérification', 'Validation', 'Performance'];
  return (
    <div>
      <div className="flex flex-col gap-0">
        {steps.map((step, index) => (
          <div key={step}>
            <div className={railBase}>
              <StepDot color="var(--wariba-brand-400)" />
              <span className="text-[color:var(--wariba-on-dark)]">{step}</span>
            </div>
            {index < steps.length - 1 ? <StepConnector /> : null}
          </div>
        ))}
      </div>
      <p className="mt-3 border-l-2 border-[#B9B2FF]/40 pl-3 font-mono text-[0.6rem] font-bold uppercase tracking-[0.06em] text-[#B9B2FF]">
        FLEX · une étape Activation s’ajoute avant Performance
      </p>
    </div>
  );
}

/** FAQ 06 — two independent risk rails, never merged into one severity. */
export function RiskRailsVisual() {
  const rails = [
    {
      label: 'Limite quotidienne',
      outcome: 'Blocage temporaire',
      color: 'var(--wariba-brand-400)',
    },
    {
      label: 'Perte maximale',
      outcome: 'Limite du compte',
      color: 'var(--wariba-accent-amber)',
    },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      {rails.map((rail) => (
        <div key={rail.label} className="flex items-center gap-2.5">
          <span className={railBase}>
            <StepDot color={rail.color} />
            <span className="text-[color:var(--wariba-on-dark)]">{rail.label}</span>
          </span>
          <span aria-hidden="true" className="h-px w-5 bg-[color:var(--wariba-seam-strong)]" />
          <span className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.08em]" style={{ color: rail.color }}>
            {rail.outcome}
          </span>
        </div>
      ))}
    </div>
  );
}

/** FAQ 07 — payout eligibility as a ladder, never a promise of approval. */
export function PayoutLadderVisual() {
  const steps = ['Conditions', 'KYC si requis', 'Prêt à demander', 'Demande', 'Review'];
  return (
    <div className="flex flex-col gap-0">
      {steps.map((step, index) => {
        const isFinal = index === steps.length - 1;
        return (
          <div key={step}>
            <div className={railBase}>
              <StepDot color={isFinal ? 'var(--wariba-accent-emerald)' : 'var(--wariba-brand-400)'} />
              <span className={isFinal ? 'text-[color:var(--wariba-accent-emerald)]' : 'text-[color:var(--wariba-on-dark)]'}>
                {step}
              </span>
            </div>
            {index < steps.length - 1 ? <StepConnector /> : null}
          </div>
        );
      })}
    </div>
  );
}
