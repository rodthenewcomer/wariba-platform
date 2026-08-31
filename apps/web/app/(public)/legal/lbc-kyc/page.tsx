import { LegalPageShell } from '../../../../components/legal/LegalPageShell';
import { LegalSection } from '../../../../components/legal/LegalSection';
import { LegalCallout } from '../../../../components/legal/LegalCallout';
import { AML_SOURCES, REGIONAL_SOURCES } from '../../../../components/legal/legal-sources';

const TOC = [
  { id: 'pourquoi', label: 'Pourquoi cette politique' },
  { id: 'nature-wariba', label: 'Nature de WARIBA' },
  { id: 'verification-identite', label: 'Vérification d’identité' },
  { id: 'donnees-collectees', label: 'Données collectées' },
  { id: 'controles-paiement', label: 'Contrôles de paiement' },
  { id: 'prevention-fraude', label: 'Prévention de la fraude' },
  { id: 'sanctions', label: 'Filtrage et sanctions' },
  { id: 'activite-suspecte', label: 'Activité suspecte' },
  { id: 'restrictions', label: 'Restrictions et refus' },
  { id: 'cooperation', label: 'Coopération avec les autorités' },
  { id: 'conservation', label: 'Conservation des dossiers' },
  { id: 'appels', label: 'Appels et contact' },
] as const;

const EN_CLAIR = [
  'WARIBA applique des contrôles d’identité, anti-fraude et de sanctions, indépendamment de sa classification légale exacte.',
  'WARIBA ne se présente pas comme une banque ou une institution financière assujettie tant que sa classification n’est pas confirmée.',
  'Lorsque la loi impose une déclaration, une conservation ou une coopération, WARIBA agit conformément aux exigences applicables.',
  'Un dossier d’identité (KYC) est distinct de votre compte de trading — les deux ne se contaminent pas.',
];

function ClassificationRail() {
  return (
    <div className="rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-accent-amber-edge)] bg-[color:var(--wariba-accent-amber-wash)] px-5 py-6">
      <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[0.1em] text-[color:var(--wariba-accent-amber)]">
        Classification en cours
      </p>
      <p className="mt-2 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
        Cette page décrit les contrôles que WARIBA applique. Elle ne conclut pas que Lagoon Technologies
        est une institution assujettie à la loi uniforme LBC/FT/FP au sens strict — cette qualification
        reste un chantier juridique ouvert.
      </p>
    </div>
  );
}

export default function LbcKycPage() {
  return (
    <LegalPageShell
      title="Lutte contre le blanchiment, vérification d’identité et intégrité financière"
      summary="Ce que WARIBA vérifie, pourquoi, et ce que cela ne signifie pas sur son statut réglementaire."
      lastUpdated="31 août 2026"
      toc={TOC}
      enClair={EN_CLAIR}
      sources={[...REGIONAL_SOURCES.filter((s) => s.id.startsWith('umoa')), ...AML_SOURCES]}
      rail={<ClassificationRail />}
      related={[
        { href: '/legal/confidentialite', label: 'Confidentialité' },
        { href: '/legal/payouts', label: 'Payouts' },
        { href: '/legal/disponibilite-pays', label: 'Disponibilité par pays' },
      ]}
    >
      <LegalSection id="pourquoi" number="1" title="Pourquoi cette politique existe">
        <p>
          WARIBA applique des contrôles d’identité, anti-fraude et de sanctions parce qu’ils protègent
          l’intégrité du programme, la fiabilité des payouts et, le cas échéant, des obligations légales
          applicables — pas parce que WARIBA revendique un statut réglementaire particulier.
        </p>
      </LegalSection>

      <LegalSection id="nature-wariba" number="2" title="Nature de WARIBA">
        <LegalCallout tone="caution" title="Pas une affirmation de statut">
          WARIBA ne se présente pas publiquement comme une banque, une institution financière, un
          établissement de paiement, ni comme une institution légalement désignée assujettie à la LBC/FT/FP,
          tant que cette classification n’est pas confirmée juridiquement.
        </LegalCallout>
      </LegalSection>

      <LegalSection id="verification-identite" number="3" title="Vérification d’identité (KYC)">
        <p>
          Une vérification d’identité peut être demandée avant le traitement d’une demande de payout,
          selon les règles du programme. Le KYC est un dossier de conformité distinct du compte de
          trading&nbsp;: les deux ne se contaminent pas.
        </p>
      </LegalSection>

      <LegalSection id="donnees-collectees" number="4" title="Données collectées">
        <ul>
          <li>Nom, date de naissance et âge déclarés.</li>
          <li>Une pièce d’identité émise par une autorité gouvernementale, lorsque requise.</li>
          <li>Un contrôle de vivacité (selfie/liveness), lorsque requis par le prestataire utilisé.</li>
          <li>Une adresse, lorsque requise.</li>
        </ul>
      </LegalSection>

      <LegalSection id="controles-paiement" number="5" title="Contrôles de paiement">
        <p>
          WARIBA peut vérifier que le moyen de paiement utilisé pour l’achat, et la destination d’un
          payout, appartiennent bien à l’utilisateur du compte concerné.
        </p>
      </LegalSection>

      <LegalSection id="prevention-fraude" number="6" title="Prévention de la fraude">
        <p>
          WARIBA surveille les signaux d’abus multi-comptes, d’usurpation d’identité et de manipulation
          de l’environnement simulé, et peut restreindre un compte sur cette base.
        </p>
      </LegalSection>

      <LegalSection id="sanctions" number="7" title="Filtrage et sanctions">
        <p>
          Lorsque cela est requis, WARIBA applique un filtrage relatif aux sanctions internationales et
          peut restreindre l’accès en cas de correspondance ou d’obligation légale applicable. WARIBA ne
          publie pas ses critères de détection internes.
        </p>
      </LegalSection>

      <LegalSection id="activite-suspecte" number="8" title="Activité suspecte">
        <p>
          Une activité jugée suspecte peut faire l’objet d’une revue supplémentaire avant tout paiement.
          Lorsque la loi impose une déclaration, une conservation, une coopération ou une mesure de gel,
          WARIBA agit conformément aux exigences applicables et coopère avec les autorités compétentes.
        </p>
      </LegalSection>

      <LegalSection id="restrictions" number="9" title="Restrictions et refus">
        <p>
          WARIBA peut restreindre l’accès à un compte lorsque la loi, une décision judiciaire ou
          gouvernementale, une restriction du prestataire de paiement, une incohérence d’identité ou un
          risque de fraude l’exige. Ces mesures ne visent jamais à indiquer aux utilisateurs comment
          contourner les contrôles en place.
        </p>
      </LegalSection>

      <LegalSection id="cooperation" number="10" title="Coopération avec les autorités">
        <p>
          WARIBA coopère avec les autorités compétentes dans les limites et selon les modalités prévues
          par la loi applicable.
        </p>
      </LegalSection>

      <LegalSection id="conservation" number="11" title="Conservation des dossiers">
        <p>
          Les dossiers d’identité et de conformité sont conservés selon les durées prévues par la
          réglementation applicable, dans le respect de la confidentialité des données concernées. Voir{' '}
          <a href="/legal/confidentialite" className="text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]">
            Confidentialité
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="appels" number="12" title="Appels et contact">
        <p>
          Un utilisateur dont la vérification d’identité est refusée peut contacter le support pour
          comprendre les prochaines étapes disponibles.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
