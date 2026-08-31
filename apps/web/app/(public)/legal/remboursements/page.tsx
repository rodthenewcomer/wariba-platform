import { LegalPageShell } from '../../../../components/legal/LegalPageShell';
import { LegalSection } from '../../../../components/legal/LegalSection';
import { LegalCallout } from '../../../../components/legal/LegalCallout';
import { REGIONAL_SOURCES } from '../../../../components/legal/legal-sources';
import { PAYIN_CLAUSE } from '../../../../components/legal/legal-payment-architecture';

const TOC = [
  { id: 'paiements', label: 'Paiements' },
  { id: 'confirmation', label: 'Confirmation et double paiement' },
  { id: 'echec-erreur', label: 'Échec et erreur de facturation' },
  { id: 'service-non-livre', label: 'Service non livré' },
  { id: 'evaluation-activee', label: 'Évaluation déjà activée' },
  { id: 'flex-activation', label: 'FLEX — frais initial et activation' },
  { id: 'demandes', label: 'Demandes de remboursement' },
  { id: 'droits-consommateur', label: 'Droits impératifs du consommateur' },
  { id: 'fraude', label: 'Fraude et contestations' },
  { id: 'litiges', label: 'Litiges' },
] as const;

const EN_CLAIR = [
  'Chaque commande porte une référence unique — une double confirmation ne crée pas un second compte.',
  'La politique définitive de remboursement n’est pas encore verrouillée : aucun délai n’est publié tant qu’elle ne l’est pas.',
  'Un problème de paiement (échec, erreur technique, double débit) est traité au cas par cas via le support.',
  'Rien ici ne prive un utilisateur des droits impératifs de son pays de résidence.',
];

export default function RemboursementsPage() {
  return (
    <LegalPageShell
      title="Paiements, annulations et remboursements"
      summary="Ce qui est déjà tranché sur les paiements WARIBA, et ce qui ne l’est pas encore."
      lastUpdated="31 août 2026"
      toc={TOC}
      enClair={EN_CLAIR}
      sources={REGIONAL_SOURCES.filter((s) => s.id === 'uemoa-directive-consommateur')}
      related={[
        { href: '/legal/conditions-utilisation', label: 'Conditions d’utilisation' },
        { href: '/legal/reclamations-litiges', label: 'Réclamations et litiges' },
      ]}
    >
      <LegalSection id="paiements" number="1" title="Paiements">
        <p>{PAYIN_CLAUSE}</p>
        <p>
          Chaque commande porte une référence propre. WARIBA la reconnaît&nbsp;: même si la
          confirmation d’un paiement arrive deux fois, un seul compte est créé et un seul montant
          est débité.
        </p>
      </LegalSection>

      <LegalSection id="confirmation" number="2" title="Confirmation et double paiement">
        <p>
          En cas de doute sur le statut d’une commande, l’utilisateur doit d’abord vérifier ce
          statut dans son espace Facturation avant de recréer une commande, puis contacter le
          support si le statut reste incertain.
        </p>
      </LegalSection>

      <LegalSection
        id="echec-erreur"
        number="3"
        title="Échec de paiement et erreur technique de facturation"
      >
        <p>
          Un paiement échoué ou une erreur technique de facturation constatée est traitée au cas par
          cas par le support, sur la base des preuves de transaction disponibles côté prestataire de
          paiement.
        </p>
      </LegalSection>

      <LegalSection id="service-non-livre" number="4" title="Service non livré">
        <p>
          Si un service payé n’a pas été délivré (par exemple un compte non créé après paiement
          confirmé), l’utilisateur peut contacter le support pour résolution.
        </p>
      </LegalSection>

      <LegalSection id="evaluation-activee" number="5" title="Évaluation déjà activée">
        <p>
          Une fois qu’une Évaluation est activée et que le trading a commencé sur le compte, l’accès
          au service a été délivré&nbsp;: cet état est pris en compte dans le traitement de toute
          demande ultérieure.
        </p>
      </LegalSection>

      <LegalSection id="flex-activation" number="6" title="FLEX — frais initial et activation">
        <p>
          Pour FLEX, le premier paiement couvre l’accès à l’Évaluation. Le solde d’activation n’est
          dû qu’en cas de réussite, selon les règles publiées au moment de l’achat.
        </p>
      </LegalSection>

      <LegalSection id="demandes" number="7" title="Demandes de remboursement">
        <LegalCallout tone="caution" title="Politique définitive non verrouillée">
          La politique définitive de remboursement de WARIBA n’est pas encore arrêtée. Aucun délai
          ni aucune condition de remboursement n’est publié tant que cette décision n’est pas
          prise&nbsp;: WARIBA préfère laisser cette section ouverte plutôt que d’inventer un délai.
          Toute demande est, en attendant, examinée individuellement via le support.
        </LegalCallout>
      </LegalSection>

      <LegalSection id="droits-consommateur" number="8" title="Droits impératifs du consommateur">
        <p>
          Rien dans cette page ne peut être lu comme une clause de type « toutes les ventes sont
          définitives en toutes circonstances ». Aucune disposition ici ne prive un utilisateur des
          droits impératifs qui lui sont accordés par la loi de son pays de résidence.
        </p>
      </LegalSection>

      <LegalSection id="fraude" number="9" title="Fraude et contestations bancaires">
        <p>
          Une contestation de paiement (chargeback) initiée sans avoir d’abord contacté le support
          peut entraîner une revue du compte concerné, dans le respect des règles applicables au
          prestataire de paiement utilisé.
        </p>
      </LegalSection>

      <LegalSection id="litiges" number="10" title="Litiges">
        <p>
          Un désaccord persistant sur un paiement suit le processus décrit sur la page{' '}
          <a
            href="/legal/reclamations-litiges"
            className="text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]"
          >
            Réclamations et litiges
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
