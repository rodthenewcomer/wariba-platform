import { cx } from '@wariba/ui';
import { DrawPath } from '../../motion/DrawPath';

export interface FlexPaymentTimelineProps {
  sizeLabel: string;
  upfrontValue: string;
  upfrontCurrency: string;
  evaluationRateLabel: string;
  activationLabel: string;
  className?: string;
}

/**
 * FLEX's visual hook — Phase 3.4.5B.3R2.
 *
 * No bridge, no metallic object: a payment timeline built the way the
 * product UI itself would draw it — a huge "paid today" figure, a line that
 * connects it to the two conditions that follow, and a checkmark that is the
 * only thing on this card standing for an event rather than a number.
 *
 * The connecting line self-draws once via `DrawPath` (pure CSS, the same
 * primitive used elsewhere on this page) — a kinetic line, not a 3D object.
 * Both amounts are canonical; nothing here computes or rounds them.
 */
export function FlexPaymentTimeline({
  sizeLabel,
  upfrontValue,
  upfrontCurrency,
  evaluationRateLabel,
  activationLabel,
  className,
}: FlexPaymentTimelineProps) {
  return (
    <div className={cx('w-full', className)}>
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-white/60 lg:text-left">
        Aujourd’hui
      </p>
      <p className="wariba-figure text-center text-[clamp(2.5rem,10vw,4.5rem)] font-bold leading-none tracking-[-0.03em] text-white lg:text-left">
        {upfrontValue}{' '}
        <span className="text-[0.4em] font-semibold text-white/60">{upfrontCurrency}</span>
      </p>
      <p className="mt-2 text-center text-xs text-white/45 lg:text-left">
        Pour cet exemple FLEX {sizeLabel}.
      </p>

      <div className="mt-10 flex flex-col items-stretch gap-0 lg:mt-12 lg:flex-row lg:items-center">
        <Milestone label="Payé aujourd’hui" tone="violet" delay={0} />
        <Connector delay={90} />
        <Milestone label="Évaluation" value={evaluationRateLabel} tone="violet" delay={180} />
        <Connector delay={270} />
        <Milestone label="Réussite" check tone="cobalt" delay={360} />
        <Connector delay={450} />
        <Milestone
          label="Activation"
          value={activationLabel}
          sublabel="Après réussite"
          tone="cyan"
          delay={540}
        />
      </div>
    </div>
  );
}

function Milestone({
  label,
  value,
  sublabel,
  check = false,
  tone,
  delay,
}: {
  label: string;
  value?: string;
  sublabel?: string;
  check?: boolean;
  tone: 'violet' | 'cobalt' | 'cyan';
  delay: number;
}) {
  const dotColor = { violet: '#B9B2FF', cobalt: '#9DB4FF', cyan: '#7BE6EF' }[tone];
  return (
    <div
      data-reveal=""
      style={{ ['--wariba-reveal-delay' as string]: `${delay}ms` }}
      className="flex flex-1 flex-col items-center gap-2 py-3 text-center lg:py-0"
    >
      {check ? (
        <span
          className="flex size-8 items-center justify-center rounded-full border-2"
          style={{ borderColor: dotColor, color: dotColor }}
          aria-hidden="true"
        >
          ✓
        </span>
      ) : (
        <span
          className="size-3 rounded-full"
          style={{ backgroundColor: dotColor, boxShadow: `0 0 16px ${dotColor}88` }}
          aria-hidden="true"
        />
      )}
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">{label}</p>
      {value ? (
        <p className="wariba-figure whitespace-nowrap text-lg font-bold text-white">{value}</p>
      ) : null}
      {sublabel ? (
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/50">
          {sublabel}
        </p>
      ) : null}
    </div>
  );
}

function Connector({ delay }: { delay: number }) {
  return (
    <div aria-hidden="true" className="flex justify-center lg:flex-1 lg:items-center lg:px-2">
      <svg viewBox="0 0 2 32" className="h-8 w-0.5 lg:hidden">
        <DrawPath
          d="M1 0 V32"
          stroke="#8B7BFF"
          strokeWidth={1.5}
          length={40}
          duration={0.5}
          delay={delay / 1000}
        />
      </svg>
      <svg viewBox="0 0 64 2" preserveAspectRatio="none" className="hidden h-0.5 w-full lg:block">
        <DrawPath
          d="M0 1 H64"
          stroke="#8B7BFF"
          strokeWidth={1.5}
          length={70}
          duration={0.5}
          delay={delay / 1000}
        />
      </svg>
    </div>
  );
}
