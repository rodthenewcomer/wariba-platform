import { LegalPageShell } from '../../../../components/legal/LegalPageShell';
import { LegalSection } from '../../../../components/legal/LegalSection';
import { LegalCallout } from '../../../../components/legal/LegalCallout';
import { REGIONAL_SOURCES } from '../../../../components/legal/legal-sources';

const TOC = [
  { id: 'avant-de-deposer', label: 'Avant de déposer' },
  { id: 'support-simple', label: 'Demande de support' },
  { id: 'reclamation-formelle', label: 'Réclamation formelle' },
  { id: 'informations-requises', label: 'Informations requises' },
  { id: 'examen-interne', label: 'Examen interne' },
  { id: 'types', label: 'Facturation, payout, KYC, confidentialité' },
  { id: 'appel', label: 'Appel et reconsidération' },
  { id: 'droits-consommateur', label: 'Droits du consommateur' },
  { id: 'droit-juridiction', label: 'Droit applicable et juridiction' },
] as const;

const EN_CLAIR = [
  'Une réclamation part toujours du support, rattachée au compte concerné.',
  'WARIBA accuse réception et traite les réclamations dans un délai raisonnable, sans promettre de délai chiffré tant qu’il n’est pas verrouillé.',
  'Vous conservez vos droits de consommateur, quelle que soit l’issue de l’examen interne.',
  'Le contact principal reste support@wariba.app — aucune autre boîte n’est inventée ici.',
];

export default function ReclamationsLitigesPage() {
  return (
    <LegalPageShell
      title="Réclamations et règlement des litiges"
      summary="Un chemin de réclamation simple et réel — pas une procédure théorique."
      lastUpdated="31 août 2026"
      toc={TOC}
      enClair={EN_CLAIR}
      sources={REGIONAL_SOURCES.filter((s) => s.id === 'uemoa-directive-consommateur')}
      related={[
        { href: '/legal/remboursements', label: 'Paiements et remboursements' },
        { href: '/legal/payouts', label: 'Payouts' },
        { href: '/support', label: 'Nous contacter' },
      ]}
    >
      <LegalSection id="avant-de-deposer" number="1" title="Avant de déposer">
        <p>
          Vérifiez d’abord le statut de votre commande, de votre demande de payout ou de votre
          dossier d’identité dans votre espace WARIBA&nbsp;: une partie des questions se résout sans
          réclamation formelle.
        </p>
      </LegalSection>

      <LegalSection id="support-simple" number="2" title="Demande de support simple">
        <p>
          Pour une question courante, contactez support@wariba.app ou passez par la page{' '}
          <a
            href="/support"
            className="text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]"
          >
            Nous contacter
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="reclamation-formelle" number="3" title="Réclamation formelle">
        <p>
          Si la réponse du support ne résout pas le désaccord, une réclamation formelle peut être
          soumise par écrit, rattachée au compte concerné, en précisant l’objet exact du désaccord.
        </p>
      </LegalSection>

      <LegalSection id="informations-requises" number="4" title="Informations et preuves requises">
        <ul>
          <li>Référence du compte, de la commande ou de la demande concernée.</li>
          <li>Description factuelle du problème.</li>
          <li>
            Toute preuve utile (capture d’écran, référence de transaction, échange antérieur).
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="examen-interne" number="5" title="Examen interne">
        <LegalCallout tone="info" title="Un délai raisonnable, pas un chiffre inventé">
          WARIBA accuse réception et traite les réclamations dans un délai raisonnable, compte tenu
          de leur nature et des obligations applicables. Aucun délai fixe (24h, 48h, 7 jours…) n’est
          promis ici tant qu’un engagement de service n’a pas été verrouillé.
        </LegalCallout>
      </LegalSection>

      <LegalSection id="types" number="6" title="Facturation, payout, KYC, confidentialité">
        <p>
          Une réclamation liée à la facturation, à une demande de payout, à une vérification
          d’identité ou à un traitement de données personnelles suit ce même chemin, avec les
          preuves conservées côté WARIBA (séquences, snapshots, dossiers) nécessaires à son examen.
        </p>
      </LegalSection>

      <LegalSection id="appel" number="7" title="Appel et reconsidération">
        <p>
          Si l’utilisateur conteste la décision issue de l’examen interne, il peut demander une
          reconsidération en apportant un élément nouveau. Cette reconsidération reste un examen
          interne — elle ne remplace pas un recours devant une autorité compétente.
        </p>
      </LegalSection>

      <LegalSection id="droits-consommateur" number="8" title="Droits du consommateur">
        <p>
          Rien dans ce processus ne prive l’utilisateur de son droit de saisir l’autorité de
          protection du consommateur ou de protection des données de son pays de résidence, ou une
          juridiction compétente.
        </p>
      </LegalSection>

      <LegalSection id="droit-juridiction" number="9" title="Droit applicable et juridiction">
        <p>
          Voir la clause de droit applicable et de juridiction dans les{' '}
          <a
            href="/legal/conditions-utilisation#droit-juridiction"
            className="text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]"
          >
            Conditions d’utilisation
          </a>
          , qui s’applique également au règlement des litiges.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
