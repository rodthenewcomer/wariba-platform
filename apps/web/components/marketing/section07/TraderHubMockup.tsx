'use client';

import { motion } from 'motion/react';
import { AnimatedNumber } from '../../motion/primitives';
import { useHydratedReducedMotion } from '../../motion/useHydratedReducedMotion';
import { DirectionTag, RadialGauge, ResultValue, SectionLabel } from './primitives';
import { ACCOUNT, RECENT_ACTIVITY, formatSigned } from './section07-data';

/*
 * A hand-rolled stagger rather than the shared `Stagger`/`StaggerItem`
 * primitives: those key their reduced-motion branch off `useReducedMotion()`
 * directly, which resolves differently between the server render and the
 * first client render and throws a hydration-mismatch warning. Every other
 * marketing component on this page defers that branch with
 * `useHydratedReducedMotion` instead, and this does the same.
 */
const CONTAINER = { show: { transition: { staggerChildren: 0.09 } } };
const ITEM = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 0.84, 0.24, 1] as const } },
};

/**
 * Trader Hub — the command center. A bento of unequal parts: one dominant
 * module (identity + progression), two stacked contextual ones (next action,
 * risk), and a live-feeling activity strip underneath all of it.
 */
export function TraderHubMockup() {
  const reduced = useHydratedReducedMotion();

  return (
    <motion.div
      className="grid gap-4 sm:gap-5 lg:grid-cols-2"
      initial={reduced ? false : 'hidden'}
      animate="show"
      variants={CONTAINER}
    >
      {/* LEFT · LARGE — account identity + progression ring */}
      <motion.div
        className="wariba-visual-card min-w-0 overflow-hidden p-5 sm:p-6 lg:row-span-2"
        data-variant="panel"
        variants={ITEM}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <SectionLabel>COMPTE</SectionLabel>
            <p className="mt-1.5 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold tracking-[-0.02em] text-[color:var(--wariba-on-dark)]">
                {ACCOUNT.productLabel}
              </span>
              <span className="font-mono text-lg text-[color:var(--wariba-on-dark-muted)]">
                {ACCOUNT.sizeLabel}
              </span>
            </p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[color:var(--wariba-brand-edge)] bg-[color:var(--wariba-brand-wash)] px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[color:var(--wariba-brand-300)]">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-[color:var(--wariba-brand-400)]" />
              {ACCOUNT.stateLabel}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
          <RadialGauge
            percent={ACCOUNT.progressPercent}
            label="Progression vers l’objectif"
            reduced={reduced}
            size={148}
            thickness={13}
            trackStyle="segmented"
            segments={10}
          >
            <AnimatedNumber
              value={ACCOUNT.progressPercent}
              format={(value) => `${value.toFixed(0)}%`}
              className="font-mono text-3xl font-bold tracking-[-0.02em] text-[color:var(--wariba-on-dark)]"
            />
            <span className="mt-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--wariba-on-dark-dim)]">
              Progression
            </span>
          </RadialGauge>

          <div className="min-w-0 text-center sm:text-left">
            <motion.p
              layoutId="section07-focus-figure"
              className="wariba-figure text-sm font-semibold text-[color:var(--wariba-on-dark)]"
            >
              {ACCOUNT.progressLabel}
            </motion.p>
            <p className="mt-1 text-xs text-[color:var(--wariba-on-dark-dim)]">{ACCOUNT.targetLabel}</p>
            <p className="mt-4 inline-block rounded-md border border-[color:var(--wariba-seam)] bg-[color:var(--wariba-surface-2)] px-2.5 py-1.5 text-[0.65rem] text-[color:var(--wariba-on-dark-muted)]">
              {ACCOUNT.nextMilestoneLabel}
            </p>
          </div>
        </div>
      </motion.div>

      {/* TOP RIGHT — next action */}
      <motion.div
        className="wariba-visual-card p-5 sm:p-6"
        data-variant="accent"
        variants={ITEM}
      >
        <SectionLabel>PROCHAINE ACTION</SectionLabel>
        <p className="mt-2.5 text-base font-semibold leading-snug text-white sm:text-lg">
          {ACCOUNT.nextAction.title}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/75">{ACCOUNT.nextAction.detail}</p>
      </motion.div>

      {/* MID RIGHT — risk status */}
      <motion.div
        className="wariba-visual-card p-5 sm:p-6"
        data-variant="panel"
        variants={ITEM}
      >
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>RISQUE DISPONIBLE</SectionLabel>
          <span className="wariba-figure text-sm font-semibold text-[color:var(--wariba-accent-emerald)]">
            {ACCOUNT.riskRemainingLabel}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <RiskMicroBar label="Quotidien" percent={ACCOUNT.riskDailyPercent} reduced={reduced} />
          <RiskMicroBar label="Maximum" percent={ACCOUNT.riskMaxPercent} reduced={reduced} />
        </div>
      </motion.div>

      {/* BOTTOM — activity strip, full width */}
      <motion.div
        className="wariba-visual-card p-5 sm:p-6 lg:col-span-2"
        data-variant="panel"
        variants={ITEM}
      >
        <SectionLabel>ACTIVITÉ RÉCENTE</SectionLabel>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-3">
          {RECENT_ACTIVITY.map((row, index) => (
            <motion.li
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--wariba-seam)] bg-[color:var(--wariba-surface-2)] px-3 py-2.5 text-sm"
              {...(!reduced && index === 0
                ? {
                    animate: { scale: [1, 1.015, 1] },
                    transition: { duration: 1, delay: 0.7, ease: 'easeInOut' },
                  }
                : {})}
            >
              <span className="flex min-w-0 items-center gap-2">
                <DirectionTag direction={row.direction} />
                <span className="truncate font-mono text-xs text-[color:var(--wariba-on-dark-muted)]">
                  {row.instrument}
                </span>
              </span>
              <ResultValue
                label={formatSigned(row.resultValue)}
                positive={row.resultValue >= 0}
                className="shrink-0 text-sm"
              />
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  );
}

function RiskMicroBar({
  label,
  percent,
  reduced,
}: {
  label: string;
  percent: number;
  reduced: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[0.65rem] uppercase tracking-[0.08em] text-[color:var(--wariba-on-dark-dim)]">
          {label}
        </span>
        <AnimatedNumber
          value={percent}
          format={(value) => `${value.toFixed(0)}%`}
          className="wariba-figure text-xs font-semibold text-[color:var(--wariba-on-dark)]"
        />
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[color:var(--wariba-track)]">
        <motion.div
          className="h-full rounded-full bg-[color:var(--wariba-brand-400)]"
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: reduced ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
