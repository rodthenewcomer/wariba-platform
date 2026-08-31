import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRightIcon, PublicSection, SectionHeader } from '@wariba/ui';

export const metadata: Metadata = {
  title: 'Afrique francophone — WARIBA',
  description: 'La vision régionale de WARIBA pour l’Afrique francophone, bientôt détaillée ici.',
};

/**
 * Placeholder for the homepage's "Afrique francophone" CTA — Section 09.
 *
 * Kept deliberately minimal: this route exists so the CTA never points at a
 * dead link, not to pre-write the fuller regional page. Same public shell,
 * same components, no new claims — nothing here says more than the homepage
 * section already does truthfully.
 */
export default function AfriqueFrancophonePage() {
  return (
    <PublicSection space="loose">
      <SectionHeader
        eyebrow="Afrique francophone"
        title="Notre vision détaillée arrive bientôt."
        align="center"
      />
      <div className="mt-9 flex justify-center">
        <Link href="/" className="wariba-cta-secondary">
          Retour à l’accueil
          <ArrowRightIcon size="sm" />
        </Link>
      </div>
    </PublicSection>
  );
}
