import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRightIcon, PublicSection, SectionHeader } from '@wariba/ui';

export const metadata: Metadata = {
  title: 'Contact — WARIBA',
  description: 'Contactez WARIBA — la page contact complète arrive bientôt.',
};

/**
 * Placeholder for the homepage's Section 10 contact preview CTA.
 *
 * Kept deliberately minimal, same as `/afrique-francophone` — this route
 * exists so the CTA never points at a dead link, not to pre-write the fuller
 * contact page (with its own channels, form and routing) that comes later.
 * The one thing worth stating here rather than waiting for that page is the
 * one canonical channel that already exists: support@wariba.app.
 */
export default function ContactPage() {
  return (
    <PublicSection space="loose">
      <SectionHeader
        eyebrow="Contact"
        title="La page contact complète arrive bientôt."
        align="center"
      />
      <p className="wariba-lead mx-auto mt-5 text-center">
        En attendant, écrivez-nous à{' '}
        <a href="mailto:support@wariba.app" className="wariba-cta-tertiary">
          support@wariba.app
        </a>
        .
      </p>
      <div className="mt-9 flex justify-center">
        <Link href="/" className="wariba-cta-secondary">
          Retour à l’accueil
          <ArrowRightIcon size="sm" />
        </Link>
      </div>
    </PublicSection>
  );
}
