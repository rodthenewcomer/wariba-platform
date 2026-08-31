'use client';

import { Fragment, type ComponentType } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, cx } from '@wariba/ui';
import { Reveal } from '../../motion/Reveal';
import { Connector } from './Connector';
import { PhaseCard, type PhaseVisualProps } from './PhaseCard';
import {
  PERFORMANCE_GOLD,
  PerformanceVisual,
  ProgressVisual,
  SelectPathVisual,
  TradeTerminalVisual,
} from './HowItWorksVisuals';
import { useJourneySequence } from './useJourneySequence';

interface Phase {
  number: string;
  label: string;
  title: string;
  copy: string;
  accentColor: string;
  Visual: ComponentType<PhaseVisualProps>;
}

const PHASES: readonly Phase[] = [
  {
    number: '01',
    label: 'Votre départ',
    title: 'Choisissez votre parcours.',
    copy: 'ONE, FLEX ou INSTANT : commencez avec la formule et la taille qui vous conviennent.',
    accentColor: 'var(--wariba-brand-400)',
    Visual: SelectPathVisual,
  },
  {
    number: '02',
    label: 'WariX',
    title: 'Tradez dans WariX.',
    copy: 'Analysez le marché, passez vos ordres et gardez le contexte de votre compte sous les yeux.',
    accentColor: '#4E8CFF',
    Visual: TradeTerminalVisual,
  },
  {
    number: '03',
    label: 'Votre état',
    title: 'Suivez votre progression.',
    copy: 'Objectif, risque restant et prochaine action restent visibles tout au long du parcours.',
    accentColor: 'var(--wariba-accent-cyan)',
    Visual: ProgressVisual,
  },
  {
    number: '04',
    label: 'Étape Performance',
    title: 'Accédez à Performance.',
    copy: 'ONE et FLEX y accèdent après leur parcours. INSTANT y commence directement.',
    accentColor: PERFORMANCE_GOLD,
    Visual: PerformanceVisual,
  },
];

/**
 * Section 03 — "Comment ça marche".
 *
 * A ten-second, high-level answer to "concrètement, comment WARIBA
 * fonctionne ?" — before the detailed pathway comparison, not instead of
 * it. Four product scenes on one shared timeline (`useJourneySequence`):
 * each phase's scene starts once the previous one has had its moment, a
 * small pulse travels the connector between them, and the CTA's border
 * traces once — after the story finishes, not the instant the section
 * scrolls into view. The `/comment-ca-marche` route from the original
 * brief already exists under a different name — `/programme` is WARIBA's
 * existing "comment ça marche" page (see its own `<title>`), already
 * linked from three other places on this homepage — so the CTA below
 * points there rather than standing up a second, competing URL.
 */
export function HowItWorksSection() {
  const {
    sectionRef,
    reduced,
    inView,
    started,
    isActive,
    connectorTravelMs,
    connectorDelayMs,
    ctaTracing,
  } = useJourneySequence();

  return (
    <section
      ref={sectionRef}
      aria-labelledby="how-it-works-title"
      className="relative isolate overflow-hidden bg-[color:var(--wariba-color-carbon-980)] py-20 lg:py-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_100%,color-mix(in_srgb,var(--wariba-brand-700)_16%,transparent),transparent_58%)]"
      />

      <div className="mx-auto max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)]">
        <Reveal>
          <p className="wariba-eyebrow">Comment ça marche</p>
          <h2 id="how-it-works-title" className="wariba-section-title mt-5 max-w-[16ch]">
            Comprenez WARIBA
            <br />
            en quatre étapes.
          </h2>
          <p className="wariba-lead mt-5 max-w-[40rem]">
            Choisissez votre parcours, tradez, suivez votre progression et accédez à Performance
            selon votre formule.
          </p>
        </Reveal>

        <div className="mt-7 flex flex-col lg:mt-11 lg:flex-row lg:items-stretch">
          {PHASES.map((phase, index) => (
            <Fragment key={phase.number}>
              <PhaseCard
                {...phase}
                started={started(index)}
                isActive={isActive(index)}
                reduced={reduced}
              />
              {index < PHASES.length - 1 ? (
                <Connector
                  reduced={reduced}
                  inView={inView}
                  delayMs={connectorDelayMs(index)}
                  travelMs={connectorTravelMs}
                  lit={started(index + 1)}
                />
              ) : null}
            </Fragment>
          ))}
        </div>

        <Reveal className="mt-9 flex flex-col items-center gap-2 text-center lg:mt-16" delay={0.15}>
          <Link href="/programme" className="how-it-works-cta wariba-cta-secondary">
            <span
              className={cx('how-it-works-cta-frame', ctaTracing && 'is-tracing')}
              aria-hidden="true"
            />
            Voir comment WARIBA fonctionne
            <ArrowRightIcon size="sm" className="how-it-works-cta-arrow" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
