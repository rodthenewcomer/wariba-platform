import { LegalPageShell } from '../../../../components/legal/LegalPageShell';
import { LegalSection } from '../../../../components/legal/LegalSection';
import { LegalCallout } from '../../../../components/legal/LegalCallout';
import { REGIONAL_SOURCES } from '../../../../components/legal/legal-sources';
import { MERCHANT_BOUNDARY_STATEMENT, PAYIN_CLAUSE, PAYOUT_FUNDING_CLAUSE } from '../../../../components/legal/legal-payment-architecture';

const TOC = [
  { id: 'objet', label: 'Objet' },
  { id: 'operateur', label: 'Opérateur' },
  { id: 'acceptation', label: 'Acceptation électronique' },
  { id: 'acces-age', label: 'Accès et âge minimum' },
  { id: 'pays-eligibles', label: 'Pays éligibles' },
  { id: 'compte', label: 'Compte et sécurité' },
  { id: 'description-wariba', label: 'Description de WARIBA' },
  { id: 'parcours', label: 'ONE, FLEX, INSTANT' },
  { id: 'performance', label: 'Performance et Review' },
  { id: 'regles', label: 'Règles applicables' },
  { id: 'paiements', label: 'Paiements et activation' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'kyc', label: 'KYC / conformité' },
  { id: 'usage-interdit', label: 'Usage interdit' },
  { id: 'suspension', label: 'Suspension et fermeture' },
  { id: 'disponibilite-technique', label: 'Disponibilité technique' },
  { id: 'propriete', label: 'Propriété intellectuelle' },
  { id: 'responsabilite', label: 'Responsabilité' },
  { id: 'protection-consommateur', label: 'Protection du consommateur' },
  { id: 'modification', label: 'Modification des conditions' },
  { id: 'droit-juridiction', label: 'Droit applicable et juridiction' },
] as const;

const EN_CLAIR = [
  'WARIBA est un service de trading simulé, pas un compte de courtage réel.',
  'L’accès est réservé aux personnes juridiquement majeures dans leur pays de résidence.',
  'Les règles attachées à votre compte au moment de l’achat restent celles qui s’appliquent.',
  'Vous ne confiez pas de capital à WARIBA pour qu’il soit investi.',
  'Un usage frauduleux ou une manipulation de l’environnement simulé peut entraîner un gel ou une fermeture.',
];

export default function ConditionsUtilisationPage() {
  return (
    <LegalPageShell
      title="Conditions d’utilisation"
      summary="Les règles contractuelles générales pour utiliser WARIBA."
      lastUpdated="31 août 2026"
      toc={TOC}
      enClair={EN_CLAIR}
      sources={REGIONAL_SOURCES}
      related={[
        { href: '/legal/trading-simule', label: 'Trading simulé' },
        { href: '/legal/risques', label: 'Risques et règles de trading' },
        { href: '/legal/remboursements', label: 'Paiements et remboursements' },
      ]}
    >
      <LegalSection id="objet" number="1" title="Objet">
        <p>
          Les présentes conditions régissent l’accès et l’utilisation des services WARIBA&nbsp;: les
          programmes ONE, FLEX et INSTANT, les Évaluations, les comptes WARIBA Performance, l’interface
          WariX et le Trader Hub.
        </p>
      </LegalSection>

      <LegalSection id="operateur" number="2" title="Opérateur">
        <p>
          WARIBA est exploité par Lagoon Technologies, société enregistrée à Abidjan, Côte d’Ivoire. Voir
          les{' '}
          <a href="/legal/mentions-legales" className="text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]">
            mentions légales
          </a>{' '}
          pour l’identité complète de l’opérateur.
        </p>
      </LegalSection>

      <LegalSection id="acceptation" number="3" title="Acceptation électronique">
        <p>
          L’utilisateur accepte les présentes conditions par une action explicite (case à cocher ou
          confirmation équivalente) avant l’achat d’un programme. Cette acceptation est horodatée et la
          version des conditions ainsi acceptée reste attachée au compte&nbsp;: une révision ultérieure
          des conditions ne s’applique pas rétroactivement à un compte déjà créé.
        </p>
      </LegalSection>

      <LegalSection id="acces-age" number="4" title="Accès et âge minimum">
        <p>
          L’utilisation des services WARIBA est réservée aux personnes juridiquement majeures dans leur
          pays de résidence, avec un minimum de 18 ans.
        </p>
        <LegalCallout tone="caution" title="Politique d’âge — valeur par défaut prudente">
          Ce seuil de 18 ans est appliqué par défaut, dans l’attente d’une confirmation formelle de la
          politique d’âge par pays. Il n’est pas présenté comme définitivement validé juridiquement dans
          chacun des six marchés visés.
        </LegalCallout>
      </LegalSection>

      <LegalSection id="pays-eligibles" number="5" title="Pays éligibles">
        <p>
          WARIBA vise actuellement la Côte d’Ivoire, le Sénégal, le Bénin, le Togo, le Mali et le Burkina
          Faso. Voir{' '}
          <a href="/legal/disponibilite-pays" className="text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]">
            Disponibilité par pays
          </a>{' '}
          pour le détail des règles applicables marché par marché.
        </p>
      </LegalSection>

      <LegalSection id="compte" number="6" title="Compte et sécurité">
        <p>
          L’utilisateur est responsable de la confidentialité de ses identifiants et de toute activité
          effectuée depuis son compte. Toute suspicion de compromission doit être signalée sans délai au
          support.
        </p>
      </LegalSection>

      <LegalSection id="description-wariba" number="7" title="Description de WARIBA">
        <LegalCallout tone="info" title="Simulation, pas capital réel">
          WARIBA fournit un environnement de trading simulé et un parcours d’évaluation. Il ne fournit
          pas de compte de courtage réel, ne reçoit pas de dépôt d’investissement et ne garantit aucun
          capital réel.
        </LegalCallout>
        <p>{MERCHANT_BOUNDARY_STATEMENT}</p>
      </LegalSection>

      <LegalSection id="parcours" number="8" title="ONE, FLEX, INSTANT">
        <ul>
          <li>
            <strong>ONE</strong> — une évaluation à une étape. Un objectif atteint peut ouvrir un compte
            WARIBA Performance.
          </li>
          <li>
            <strong>FLEX</strong> — un premier paiement réduit, avec un solde qui n’est dû qu’en cas de
            réussite de l’évaluation.
          </li>
          <li>
            <strong>INSTANT</strong> — pas d’évaluation&nbsp;: accès direct à un compte WARIBA
            Performance simulé.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="performance" number="9" title="Performance et WARIBA Review">
        <p>
          WARIBA Performance reste un environnement simulé. Après le dernier payout payé d’un cycle, le
          compte entre dans WARIBA Review&nbsp;: cette étape ne garantit ni une allocation de capital
          réel, ni un sixième payout, ni une relation d’emploi.
        </p>
      </LegalSection>

      <LegalSection id="regles" number="10" title="Règles applicables">
        <p>
          Les règles de perte quotidienne, de perte maximale et les autres règles du programme sont
          celles publiées et attachées au compte au moment de l’achat (« rule snapshot »). Voir{' '}
          <a href="/legal/risques" className="text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]">
            Risques et règles de trading
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="paiements" number="11" title="Paiements et activation FLEX">
        <p>
          Le prix contractuel et le montant final sont exprimés en FCFA/XOF. Pour FLEX, le solde
          d’activation est dû uniquement en cas de réussite de l’évaluation, selon les règles publiées au
          moment de l’achat.
        </p>
        <p>{PAYIN_CLAUSE}</p>
      </LegalSection>

      <LegalSection id="payouts" number="12" title="Payouts">
        <p>
          Lorsque les conditions applicables sont remplies, une demande de payout peut être soumise et
          traitée selon les règles du compte et les vérifications applicables. Voir{' '}
          <a href="/legal/payouts" className="text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]">
            Payouts
          </a>
          .
        </p>
        <p>{PAYOUT_FUNDING_CLAUSE}</p>
      </LegalSection>

      <LegalSection id="kyc" number="13" title="KYC / conformité">
        <p>
          Une vérification d’identité peut être demandée avant qu’une demande de payout ne soit traitée.
          Voir{' '}
          <a href="/legal/lbc-kyc" className="text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]">
            LBC / KYC
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="usage-interdit" number="14" title="Usage interdit">
        <p>
          La fraude, l’accès non autorisé, la manipulation de l’environnement simulé, le partage de
          compte et la tentative de contourner les règles du programme peuvent entraîner un gel, une
          revue ou une fermeture du compte, selon la policy et les preuves auditées.
        </p>
      </LegalSection>

      <LegalSection id="suspension" number="15" title="Suspension et fermeture du compte">
        <p>
          WARIBA peut suspendre ou fermer un compte en cas de violation des présentes conditions, de
          fraude avérée ou suspectée, ou pour se conformer à une obligation légale applicable.
        </p>
      </LegalSection>

      <LegalSection id="disponibilite-technique" number="16" title="Disponibilité technique">
        <p>
          WariX et les données de marché affichées appartiennent à un environnement simulé&nbsp;;
          l’exécution, le prix affiché et la disponibilité de la plateforme ne constituent pas une
          garantie d’exécution réelle.
        </p>
      </LegalSection>

      <LegalSection id="propriete" number="17" title="Propriété intellectuelle">
        <p>
          Le nom WARIBA, son logo et son interface restent la propriété de Lagoon Technologies. Voir les{' '}
          <a href="/legal/mentions-legales" className="text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]">
            mentions légales
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="responsabilite" number="18" title="Responsabilité et force majeure">
        <p>
          WARIBA n’est pas responsable des pertes résultant d’un trading réel effectué en dehors de son
          environnement simulé. La responsabilité de WARIBA peut être limitée en cas d’événement hors de
          son contrôle raisonnable (force majeure, panne d’un prestataire tiers).
        </p>
      </LegalSection>

      <LegalSection id="protection-consommateur" number="19" title="Protection du consommateur et réclamations">
        <p>
          Rien dans les présentes conditions ne prive un utilisateur des protections impératives qui lui
          sont accordées par la loi de son pays de résidence. Voir{' '}
          <a href="/legal/reclamations-litiges" className="text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]">
            Réclamations et litiges
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="modification" number="20" title="Modification des conditions">
        <p>
          WARIBA peut mettre à jour les présentes conditions. Une version modifiée ne s’applique pas
          rétroactivement aux règles déjà attachées à un compte existant.
        </p>
      </LegalSection>

      <LegalSection id="droit-juridiction" number="21" title="Droit applicable et juridiction">
        <p>
          Les présentes conditions sont régies, dans la mesure permise, par le droit applicable en Côte
          d’Ivoire, sans priver un consommateur des protections impératives qui lui sont accordées par la
          loi de son pays de résidence.
        </p>
        <LegalCallout tone="caution" title="Rédaction finale soumise à revue par un conseil juridique">
          Cette clause décrit l’intention&nbsp;: elle n’a pas encore été validée par un conseil
          spécialisé en droit UEMOA/fintech dans chacun des six marchés visés.
        </LegalCallout>
      </LegalSection>
    </LegalPageShell>
  );
}
