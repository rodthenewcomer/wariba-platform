import { cx } from '@wariba/ui';
import { ProgressBar } from '../../motion/primitives';

export interface OneEvaluationPanelProps {
  sizeLabel: string;
  targetLabel: string;
  /** 0–100. Illustrative mid-course position — this page has no logged-in trader. */
  progressPercent: number;
  progressLabel: string;
  maximumLossLabel: string;
  upfrontLabel: string;
  className?: string;
}

/**
 * ONE's visual hook — Phase 3.4.5B.3R2.
 *
 * The prior build put a decorative ring here and called it "3D". It read as
 * an icon, not a product. This is the replacement: the same evaluation panel
 * a trader would actually see, at a size that holds its half of the chapter —
 * a huge target figure, a real progress bar, and the two numbers that matter
 * before someone pays.
 *
 * The target and the loss ceiling are canonical, read from the offer. The
 * mid-course progress figure is not — nobody is logged in on a marketing
 * page — so it is marked "Exemple" rather than presented as a real result.
 */
export function OneEvaluationPanel({
  sizeLabel,
  targetLabel,
  progressPercent,
  progressLabel,
  maximumLossLabel,
  upfrontLabel,
  className,
}: OneEvaluationPanelProps) {
  return (
    <div
      className={cx(
        'overflow-hidden rounded-[20px] border border-white/10 bg-[#0a0b0f] p-6 sm:p-8',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
          WARIBA ONE · {sizeLabel}
        </p>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">
          Exemple
        </span>
      </div>

      <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">
        Objectif
      </p>
      <p className="commerce-rule-figure mt-1 text-[color:var(--wariba-brand-300)]">
        {targetLabel}
      </p>

      <div className="mt-7">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">
            Progression
          </p>
          <p className="wariba-figure text-sm font-semibold text-white/85">{progressLabel}</p>
        </div>
        <div className="mt-3">
          <ProgressBar
            percent={progressPercent}
            label="Progression vers l’objectif ONE"
            tone="indigo"
          />
        </div>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">
            Perte maximale
          </p>
          <p className="wariba-figure mt-1.5 text-xl font-bold tracking-[-0.02em] text-white">
            {maximumLossLabel}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">
            Paiement
          </p>
          <p className="wariba-figure mt-1.5 whitespace-nowrap text-xl font-bold tracking-[-0.02em] text-white">
            {upfrontLabel}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/50">
            Une seule fois
          </p>
        </div>
      </div>
    </div>
  );
}
