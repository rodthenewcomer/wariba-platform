import { cx } from '@wariba/ui';
import { PerformanceDays } from './PerformanceDays';

export interface PerformancePanelProps {
  familyLabel: string;
  sizeLabel: string;
  performanceDaysRequired: number;
  performanceDayThresholdLabel: string;
  className?: string;
}

/**
 * The Performance explainer's visual hook.
 *
 * Phase 3.4.5B.3R rejects the glowing orb here: a visitor cannot tell what
 * "Performance" is from a lit sphere. A compact account mockup can be read in
 * one glance the way a real product screen would be.
 *
 * Two kinds of numbers share this surface, and they must not be confused:
 * the balance strip is illustrative — a demonstration account, labelled as
 * one — while the days-validated meter below it is the one real product rule
 * on this card, driven by the same canonical figures the rest of the
 * homepage reads from.
 */
export function PerformancePanel({
  familyLabel,
  sizeLabel,
  performanceDaysRequired,
  performanceDayThresholdLabel,
  className,
}: PerformancePanelProps) {
  return (
    <div
      className={cx(
        'overflow-hidden rounded-[20px] border border-white/10 bg-[#0b0c10] p-5 sm:p-8',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
            WARIBA PERFORMANCE
          </p>
          <p className="mt-1 text-sm font-semibold text-white/85">
            {familyLabel} · {sizeLabel} · Performance
          </p>
        </div>
        <span className="rounded-full border border-[color:var(--wariba-accent-emerald-edge)] bg-[color:var(--wariba-accent-emerald-wash)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--wariba-accent-emerald)]">
          Exemple simulé
        </span>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2 border-t border-white/10 pt-6 sm:gap-3">
        <Metric label="SOLDE" value="25 631" suffix="USD" />
        <Metric label="ÉQUITÉ" value="25 884" suffix="USD" />
        <Metric label="VERSEMENT ÉLIGIBLE" value="+631" suffix="USD" tone="emerald" />
      </div>

      <div className="mt-7 border-t border-white/10 pt-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">
          Journées Performance
        </p>
        <div className="mt-3">
          <PerformanceDays
            required={performanceDaysRequired}
            thresholdLabel={performanceDayThresholdLabel}
          />
        </div>
      </div>

      <p className="mt-6 text-[11px] leading-relaxed text-white/60">
        Chiffres de démonstration. Aucun compte réel n’a produit ces résultats.
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  suffix,
  tone = 'default',
}: {
  label: string;
  value: string;
  suffix?: string;
  tone?: 'default' | 'emerald';
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase leading-tight tracking-[0.06em] text-white/60 sm:text-[10px] sm:tracking-[0.14em]">
        {label}
      </p>
      <p
        className={cx(
          'wariba-figure mt-1.5 whitespace-nowrap text-base font-bold tracking-[-0.02em] sm:text-xl',
          tone === 'emerald' ? 'text-[color:var(--wariba-accent-emerald)]' : 'text-white',
        )}
      >
        {value}
        {suffix ? (
          <span className="ml-1 text-[10px] font-semibold text-white/60 sm:text-xs">{suffix}</span>
        ) : null}
      </p>
    </div>
  );
}
