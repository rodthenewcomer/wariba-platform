import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRightIcon, Icon, PublicSection } from '@wariba/ui';
import { Reveal } from '../../motion/Reveal';

interface IntentItem {
  title: string;
  body: string;
  icon: ReactNode;
}

interface HeroChip {
  label: string;
  /** One of the `.s10-hero-chip-*` position modifiers defined in `globals.css`. */
  position: 'a' | 'b' | 'c';
  delay: number;
}

/*
 * Four bespoke glyphs, drawn to the shell icon set's own 24-box / 1.75px
 * stroke convention (see `packages/ui/src/icons/shell-icons.tsx`) but kept
 * local rather than added there — that file is reserved for the header,
 * mega-menu, drawer and footer, and these exist only to label this one
 * section's email block and intent row.
 */
function MailIcon() {
  return (
    <Icon size="sm">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M4.5 7 12 12.5 19.5 7" />
    </Icon>
  );
}

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

const INTENT_ITEMS: readonly IntentItem[] = [
  {
    title: 'Parcours et comptes',
    body: 'ONE, FLEX, INSTANT, tailles de compte et fonctionnement général.',
    icon: <TiersIcon />,
  },
  {
    title: 'Plateforme et utilisation',
    body: 'WariX, navigation, accès et utilisation de la plateforme.',
    icon: <PlatformIcon />,
  },
  {
    title: 'Demande générale',
    body: 'Toute autre question ou prise de contact plus large.',
    icon: <GeneralIcon />,
  },
] as const;

const HERO_CHIPS: readonly HeroChip[] = [
  { label: 'Question sur FLEX 25K', position: 'a', delay: 0.22 },
  { label: 'Accès à WariX', position: 'b', delay: 0.32 },
  { label: 'Demande générale', position: 'c', delay: 0.42 },
] as const;

/**
 * Section 10 — Contact preview.
 *
 * Rebuilt from a first pass that stacked three identical dark cards on the
 * left against an empty text-only panel on the right — administrative, not
 * alive. This version leads with a photograph (already licensed and live on
 * `/support` and `/programme`, reused here rather than sourcing something
 * new for a homepage that already has enough product UI) with three
 * floating request pills and a contact-identity bar over it, and moves the
 * three intent categories into one compact row beneath both columns.
 *
 * Still no claim WARIBA can't back — no 24/7, no team size, no language
 * count, no routing promise. `support@wariba.app` is the one canonical
 * channel, so it's the thing given the most visual weight.
 */
export function ContactPreviewSection() {
  return (
    <PublicSection aria-labelledby="contact-preview-title">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
        <Reveal>
          <p className="wariba-eyebrow">Contact</p>
          <h2 id="contact-preview-title" className="wariba-section-title mt-5 max-w-[16ch]">
            Parlons de votre parcours WARIBA.
          </h2>
          <p className="wariba-lead mt-5 max-w-[30rem]">
            Une question sur votre compte, votre parcours ou WariX ? Retrouvez le bon point de
            contact et les informations utiles.
          </p>

          <div className="mt-8">
            <p className="s10-email-label">Écrivez-nous</p>
            <a href="mailto:support@wariba.app" className="s10-email">
              <span className="s10-email-icon" aria-hidden="true">
                <MailIcon />
              </span>
              support@wariba.app
            </a>
          </div>

          <Link href="/contact" className="s10-cta wariba-cta-secondary mt-8">
            <span className="s10-cta-frame" aria-hidden="true" />
            Voir la page contact
            <span className="s10-cta-arrow inline-flex">
              <ArrowRightIcon size="sm" />
            </span>
          </Link>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="s10-hero">
            <Image
              src="/images/wariba-support-team.webp"
              alt="Deux professionnels ouest-africains examinent ensemble un dossier de risque"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="s10-hero-media"
            />
            <div aria-hidden="true" className="s10-hero-overlay" />

            {HERO_CHIPS.map((chip) => (
              <Reveal
                key={chip.label}
                delay={chip.delay}
                className={`s10-hero-chip s10-hero-chip-${chip.position}`}
              >
                <span className="s10-hero-chip-dot" aria-hidden="true" />
                {chip.label}
              </Reveal>
            ))}

            <Reveal delay={0.52} className="s10-hero-identity">
              <span className="s10-hero-identity-mark" aria-hidden="true" />
              WARIBA · support@wariba.app
            </Reveal>
          </div>
        </Reveal>
      </div>

      <Reveal delay={0.3} className="s10-mini-row mt-12 lg:mt-16">
        {INTENT_ITEMS.map((item) => (
          <div key={item.title} className="s10-mini-item">
            <span className="s10-mini-icon" aria-hidden="true">
              {item.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[color:var(--wariba-on-dark)]">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
                {item.body}
              </p>
            </div>
            <span className="s10-mini-arrow" aria-hidden="true">
              <ArrowRightIcon size="sm" />
            </span>
          </div>
        ))}
      </Reveal>
    </PublicSection>
  );
}
