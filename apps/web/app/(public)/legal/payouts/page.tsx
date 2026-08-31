import { LegalPageShell } from '../../../../components/legal/LegalPageShell';
import { LegalSection } from '../../../../components/legal/LegalSection';
import { LegalCallout } from '../../../../components/legal/LegalCallout';
import { REGIONAL_SOURCES } from '../../../../components/legal/legal-sources';
import { PAYOUT_FUNDING_CLAUSE } from '../../../../components/legal/legal-payment-architecture';

const TOC = [
  { id: 'definition', label: 'Ce qu’est un payout' },
  { id: 'performance-only', label: 'Comptes Performance uniquement' },
  { id: 'readiness', label: 'Prêt à demander' },
  { id: 'kyc', label: 'KYC applicable' },
  { id: 'soumission', label: 'Soumission de la demande' },
  { id: 'statuts', label: 'Statuts d’une demande' },
  { id: 'traitement', label: 'Traitement du paiement' },
  { id: 'prestataires', label: 'Prestataires tiers' },
  { id: 'coordonnees', label: 'Coordonnées incorrectes' },
  { id: 'fraude', label: 'Revue fraude / conformité' },
  { id: 'devise', label: 'Devise et frais de change' },
  { id: 'echecs', label: 'Paiements échoués' },
  { id: 'fiscalite-reclamation', label: 'Fiscalité et réclamations' },
] as const;

const EN_CLAIR = [
  'Un payout WARIBA est un versement contractuel lié aux règles du programme simulé.',
  'Un payout n’est ni un rendement sur investissement, ni un intérêt, ni un salaire.',
  'Une demande passe par plusieurs statuts distincts : En revue, Approuvé, En traitement, Payé.',
  'Approuvé ne signifie pas encore payé — seul le statut « Payé » confirme le paiement.',
];

function PayoutDistinctionRail() {
  return (
    <div className="rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-brand-edge)] bg-[color:var(--wariba-brand-wash)] px-5 py-6">
      <p className="text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-on-dark)]">
        Payout ≠ rendement d’investissement
      </p>
      <p className="mt-3 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
        Un payout n’est jamais décrit comme un intérêt, un salaire ou un dividende. C’est un
        versement contractuel, conditionné aux règles publiées du compte concerné.
      </p>
    </div>
  );
}

export default function PayoutsPage() {
  return (
    <LegalPageShell
      title="Politique de payouts"
      summary="Comment une demande de payout WARIBA est soumise, vérifiée et traitée."
      lastUpdated="31 août 2026"
      toc={TOC}
      enClair={EN_CLAIR}
      sources={REGIONAL_SOURCES.filter((s) => s.id === 'bceao-instruction-paiement')}
      rail={<PayoutDistinctionRail />}
      related={[
        { href: '/legal/trading-simule', label: 'Trading simulé' },
        { href: '/aide/payouts', label: 'Centre d’aide — Payouts' },
        { href: '/legal/reclamations-litiges', label: 'Réclamations et litiges' },
      ]}
    >
      <LegalSection id="definition" number="1" title="Ce qu’est un payout WARIBA">
        <p>
          Un payout WARIBA est un versement contractuel lié aux règles du programme simulé souscrit
          par l’utilisateur. Il ne constitue ni un rendement sur investissement, ni un intérêt, ni
          un salaire, ni une promesse de revenu.
        </p>
      </LegalSection>

      <LegalSection id="performance-only" number="2" title="Comptes Performance uniquement">
        <p>
          Les demandes de payout concernent uniquement les comptes WARIBA Performance ayant atteint
          les conditions publiées pour le cycle en cours.
        </p>
      </LegalSection>

      <LegalSection id="readiness" number="3" title="Prêt à demander">
        <p>
          Lorsqu’un compte devient prêt à demander selon les règles applicables, une demande peut
          être soumise. « Prêt à demander » est un état calculé à partir des règles du compte, pas
          une décision discrétionnaire.
        </p>
      </LegalSection>

      <LegalSection id="kyc" number="4" title="KYC applicable">
        <p>
          Une vérification d’identité peut être requise avant le traitement d’une demande. Voir{' '}
          <a
            href="/legal/lbc-kyc"
            className="text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]"
          >
            LBC / KYC
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="soumission" number="5" title="Soumission de la demande">
        <p>
          La demande est soumise via le Trader Hub, rattachée au compte concerné, et traitée selon
          les règles du compte et les vérifications d’identité ou de conformité applicables.
        </p>
      </LegalSection>

      <LegalSection id="statuts" number="6" title="Statuts d’une demande">
        <ul>
          <li>
            <strong>En revue</strong> — WARIBA vérifie la demande.
          </li>
          <li>
            <strong>Approuvé</strong> — la décision est positive. Aucun paiement n’est encore
            confirmé.
          </li>
          <li>
            <strong>En traitement</strong> — le transfert a été soumis ou est en cours chez le
            prestataire.
          </li>
          <li>
            <strong>Payé</strong> — le paiement a été confirmé et réconcilié.
          </li>
        </ul>
        <LegalCallout tone="caution" title="Approuvé ≠ payé">
          WARIBA n’affiche jamais « Payé » parce qu’une demande a été approuvée. Seul le statut «
          Payé » confirme que le paiement a effectivement eu lieu.
        </LegalCallout>
      </LegalSection>

      <LegalSection id="traitement" number="7" title="Traitement du paiement">
        <p>{PAYOUT_FUNDING_CLAUSE}</p>
        <LegalCallout tone="info" title="D’où vient l’argent d’un payout">
          Un payout n’est pas le retrait d’un solde détenu sur votre compte de trading simulé — ce
          compte n’a jamais contenu d’argent réel. Il est financé par la trésorerie de Lagoon
          Technologies, comme toute obligation contractuelle de l’entreprise, puis versé par un
          prestataire de paiement tiers.
        </LegalCallout>
      </LegalSection>

      <LegalSection id="prestataires" number="8" title="Prestataires tiers">
        <p>
          Les paiements peuvent être traités par des prestataires tiers autorisés, selon leur
          disponibilité et les règles applicables. WARIBA peut travailler avec un ou plusieurs
          prestataires selon le pays et la méthode de versement. Lagoon Technologies reste le
          marchand et l’opérateur du service WARIBA&nbsp;; elle ne se substitue pas à ces
          prestataires et ne devient pas elle-même un établissement de paiement.
        </p>
      </LegalSection>

      <LegalSection id="coordonnees" number="9" title="Coordonnées incorrectes">
        <p>
          Une demande soumise avec des coordonnées de paiement incorrectes ou incomplètes peut être
          retardée ou rejetée jusqu’à correction par l’utilisateur.
        </p>
      </LegalSection>

      <LegalSection id="fraude" number="10" title="Revue fraude / conformité">
        <p>
          Une demande peut faire l’objet d’une revue supplémentaire en cas de signal de fraude ou
          d’obligation de conformité applicable, avant tout paiement.
        </p>
      </LegalSection>

      <LegalSection id="devise" number="11" title="Devise et frais de change">
        <p>
          Les montants sont exprimés en FCFA/XOF. Un équivalent dans une autre devise, s’il est
          affiché, est informatif et peut différer du taux appliqué par le prestataire de paiement.
        </p>
      </LegalSection>

      <LegalSection id="echecs" number="12" title="Paiements échoués">
        <p>
          En cas d’échec d’un transfert déjà approuvé, WARIBA travaille avec le prestataire concerné
          pour identifier la cause et proposer une nouvelle tentative ou une correction, sans double
          paiement.
        </p>
      </LegalSection>

      <LegalSection id="fiscalite-reclamation" number="13" title="Fiscalité et réclamations">
        <p>
          Le traitement fiscal d’un payout relève de la responsabilité de l’utilisateur dans son
          pays de résidence. Une réclamation liée à un payout suit le processus décrit sur la page{' '}
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
