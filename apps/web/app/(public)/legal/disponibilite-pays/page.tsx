import { LegalPageShell } from '../../../../components/legal/LegalPageShell';
import { LegalSection } from '../../../../components/legal/LegalSection';
import { LegalCallout } from '../../../../components/legal/LegalCallout';
import { LegalCountryMatrix } from '../../../../components/legal/LegalCountryMatrix';
import { REGIONAL_SOURCES } from '../../../../components/legal/legal-sources';
import { MERCHANT_BOUNDARY_STATEMENT } from '../../../../components/legal/legal-payment-architecture';

const TOC = [
  { id: 'marches-vises', label: 'Marchés visés' },
  { id: 'residence-age', label: 'Résidence et âge' },
  { id: 'kyc-paiement', label: 'KYC et paiement' },
  { id: 'restrictions', label: 'Sanctions et restrictions' },
  { id: 'matrice', label: 'Matrice par pays' },
  { id: 'paiements-transfrontaliers', label: 'Paiements transfrontaliers' },
  { id: 'evolutions', label: 'Évolutions du service' },
  { id: 'responsabilite', label: 'Responsabilité de l’utilisateur' },
] as const;

const EN_CLAIR = [
  'Disponibilité commerciale ne signifie pas agrément financier local.',
  'WARIBA vise six marchés : Côte d’Ivoire, Sénégal, Bénin, Togo, Mali, Burkina Faso.',
  'La disponibilité d’un service dans un pays ne fait pas de WARIBA une banque, un courtier ou un intermédiaire financier agréé dans ce pays.',
  'Les services disponibles et leurs conditions peuvent varier selon le pays de résidence.',
];

export default function DisponibilitePaysPage() {
  return (
    <LegalPageShell
      title="Disponibilité des services par pays"
      summary="WARIBA est un service numérique de simulation et d’évaluation. La disponibilité d’un service dans un pays ne signifie pas que WARIBA y est une banque, un courtier ou un intermédiaire financier agréé."
      lastUpdated="31 août 2026"
      toc={TOC}
      enClair={EN_CLAIR}
      sources={REGIONAL_SOURCES}
      related={[
        { href: '/legal/conditions-utilisation', label: 'Conditions d’utilisation' },
        { href: '/legal/lbc-kyc', label: 'LBC / KYC' },
        { href: '/afrique-francophone', label: 'Afrique francophone' },
      ]}
    >
      <LegalSection id="marches-vises" number="1" title="Marchés visés">
        <p>
          WARIBA vise actuellement six marchés&nbsp;: Côte d’Ivoire, Sénégal, Bénin, Togo, Mali et
          Burkina Faso. Il s’agit de marchés cibles, pas d’une liste de pays où WARIBA détient un
          agrément financier ou un bureau.
        </p>
      </LegalSection>

      <LegalSection id="residence-age" number="2" title="Résidence et âge">
        <p>
          L’accès à WARIBA dépend du pays de résidence déclaré et de l’âge de l’utilisateur. Voir{' '}
          <a
            href="/legal/conditions-utilisation"
            className="text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]"
          >
            Conditions d’utilisation
          </a>{' '}
          pour la politique d’âge applicable.
        </p>
      </LegalSection>

      <LegalSection id="kyc-paiement" number="3" title="KYC et disponibilité de paiement">
        <p>
          La disponibilité effective des moyens de paiement et des méthodes de payout dépend du pays
          et des prestataires tiers actifs sur ce marché à un instant donné.
        </p>
      </LegalSection>

      <LegalSection id="restrictions" number="4" title="Sanctions et restrictions">
        <p>
          L’accès à WARIBA peut être restreint dans un pays ou pour un utilisateur donné en cas
          d’obligation légale, de sanction applicable, ou de restriction imposée par un prestataire
          de paiement.
        </p>
      </LegalSection>

      <LegalSection id="matrice" number="5" title="Matrice par pays">
        <LegalCountryMatrix />
        <LegalCallout tone="caution" title="Tableau informatif — pas une déclaration d’agrément">
          Ce tableau indique quels cadres légaux nationaux s’appliquent. Il ne signifie à aucun
          moment que WARIBA est « agréé » ou « licencié » dans l’un de ces pays.
        </LegalCallout>
      </LegalSection>

      <LegalSection id="paiements-transfrontaliers" number="6" title="Paiements transfrontaliers">
        <p>
          Certains flux de paiement peuvent franchir une frontière au sein de l’UEMOA. Ces flux sont
          traités par des prestataires tiers, dans le cadre du Règlement n°06/2024/CM/UEMOA relatif
          aux relations financières extérieures.
        </p>
        <p>{MERCHANT_BOUNDARY_STATEMENT}</p>
      </LegalSection>

      <LegalSection id="evolutions" number="7" title="Évolutions du service">
        <p>
          La liste des marchés visés et les conditions applicables peuvent évoluer. Une évolution ne
          s’applique pas rétroactivement aux règles déjà attachées à un compte existant.
        </p>
      </LegalSection>

      <LegalSection id="responsabilite" number="8" title="Responsabilité de l’utilisateur">
        <p>
          Il appartient à l’utilisateur de vérifier que l’utilisation de WARIBA est conforme à la
          loi de son propre pays de résidence, y compris les droits de consommation et de protection
          des données qui lui sont propres.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
