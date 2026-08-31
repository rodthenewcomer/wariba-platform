import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { ArrowRightIcon, Icon, PublicSection, VisualCard } from '@wariba/ui';
import { Reveal } from '../../motion/Reveal';

interface IntentCard {
  title: string;
  body: string;
  example: string;
  icon: ReactNode;
}

/*
 * Three bespoke glyphs, drawn to the shell icon set's own 24-box / 1.75px
 * stroke convention (see `packages/ui/src/icons/shell-icons.tsx`) but kept
 * local rather than added there — that file is reserved for the header,
 * mega-menu, drawer and footer, and these three exist only to label a
 * homepage section's cards.
 */
function TiersIcon() {
  return (
    <Icon size="sm">
      <path d="M12 4 20 8l-8 4-8-4 8-4Z" />
      <path d="M4 12l8 4 8-4" />
      <path d="M4 16l8 4 8-4" />
    </Icon>
  );
}

function PlatformIcon() {
  return (
    <Icon size="sm">
      <rect x="4" y="5" width="16" height="11" rx="1.5" />
      <path d="M9 20h6M12 16v4" />
    </Icon>
  );
}

function GeneralIcon() {
  return (
    <Icon size="sm">
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6a2.5 2.5 0 0 1-2.5 2.5H10l-4 4v-4H7.5A2.5 2.5 0 0 1 5 12.5v-6Z" />
    </Icon>
  );
}

const INTENT_CARDS: readonly IntentCard[] = [
  {
    title: 'Parcours et comptes',
    body: 'Questions sur ONE, FLEX, INSTANT, les tailles de compte et le fonctionnement général.',
    example: 'Question sur FLEX 25K',
    icon: <TiersIcon />,
  },
  {
    title: 'Plateforme et utilisation',
    body: 'Besoin d’aide sur WariX, la navigation, l’accès ou l’utilisation de la plateforme ?',
    example: 'Accès à la plateforme',
    icon: <PlatformIcon />,
  },
  {
    title: 'Demande générale',
    body: 'Un autre besoin, une question générale ou une prise de contact plus large ?',
    example: 'Demande générale',
    icon: <GeneralIcon />,
  },
] as const;

/**
 * Section 10 — Contact preview.
 *
 * Not a support-desk brag section: WARIBA doesn't have a claim to make about
 * 24/7 coverage, team size or language count, so this doesn't reach for one.
 * Its job is narrower and more honest — tell the visitor a real inbox
 * (support@wariba.app) exists, help them place their own question into one
 * of three categories, and route everyone toward `/contact` for the fuller
 * page. The right-side panel is a conceptual routing diagram, not a mock
 * inbox: three questions converging on one address, nothing that pretends a
 * live chat product exists behind it.
 */
export function ContactPreviewSection() {
  return (
    <PublicSection aria-labelledby="contact-preview-title">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-16">
        <div>
          <Reveal>
            <p className="wariba-eyebrow">Contact</p>
            <h2 id="contact-preview-title" className="wariba-section-title mt-5 max-w-[18ch]">
              Une question avant de commencer ?
            </h2>
            <p className="wariba-lead mt-5 max-w-[34rem]">
              Parcours, règles, compte, plateforme ou demande générale : contactez WARIBA par le
              canal qui vous convient.
            </p>
          </Reveal>

          <ul className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {INTENT_CARDS.map((card, index) => (
              <Reveal key={card.title} as="li" delay={0.08 + index * 0.06}>
                <VisualCard variant="panel" interactive className="s10-card h-full p-5">
                  <span className="s10-card-icon" aria-hidden="true">
                    {card.icon}
                  </span>
                  <p className="mt-3 text-sm font-bold text-[color:var(--wariba-on-dark)]">
                    {card.title}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
                    {card.body}
                  </p>
                </VisualCard>
              </Reveal>
            ))}
          </ul>

          <Reveal delay={0.28} className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
            <Link href="/contact" className="s10-cta wariba-cta-secondary">
              <span className="s10-cta-frame" aria-hidden="true" />
              Voir la page contact
              <span className="s10-cta-arrow inline-flex">
                <ArrowRightIcon size="sm" />
              </span>
            </Link>
            <a href="mailto:support@wariba.app" className="wariba-cta-tertiary">
              Nous écrire
              <ArrowRightIcon size="sm" />
            </a>
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <div className="wariba-product-surface s10-hub">
            <p className="s10-hub-caption">Nous vous orientons vers le bon canal</p>

            <ul className="mt-6 flex flex-col gap-4">
              {INTENT_CARDS.map((card, index) => (
                <li
                  key={card.title}
                  className="s10-hub-row"
                  style={{ '--s10-row-delay': `${300 + index * 180}ms` } as CSSProperties}
                >
                  <span className="s10-hub-dot" aria-hidden="true" />
                  <span className="s10-hub-example">« {card.example} »</span>
                  <span className="s10-hub-line" aria-hidden="true" />
                </li>
              ))}
            </ul>

            <div className="s10-hub-badge">
              <span className="s10-hub-badge-mark" aria-hidden="true" />
              WARIBA · support@wariba.app
            </div>
          </div>
        </Reveal>
      </div>
    </PublicSection>
  );
}
