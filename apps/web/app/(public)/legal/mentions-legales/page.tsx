import { LegalPageShell } from '../../../../components/legal/LegalPageShell';
import { LegalSection } from '../../../../components/legal/LegalSection';
import { LegalCallout } from '../../../../components/legal/LegalCallout';
import { REGIONAL_SOURCES } from '../../../../components/legal/legal-sources';

const TOC = [
  { id: 'editeur', label: 'Éditeur du service' },
  { id: 'operateur', label: 'Opérateur' },
  { id: 'siege', label: 'Siège et adresse' },
  { id: 'immatriculation', label: 'Immatriculation' },
  { id: 'contact', label: 'Contact' },
  { id: 'hebergeur', label: 'Hébergeur' },
  { id: 'propriete-intellectuelle', label: 'Propriété intellectuelle' },
  { id: 'disponibilite', label: 'Disponibilité du site' },
  { id: 'nature-service', label: 'Nature du service WARIBA' },
  { id: 'liens-externes', label: 'Liens externes' },
  { id: 'droit-applicable', label: 'Droit applicable' },
] as const;

const EN_CLAIR = [
  'WARIBA est édité par Lagoon Technologies, société enregistrée à Abidjan, Côte d’Ivoire.',
  'WARIBA est un service numérique de simulation et d’évaluation de trading — pas une banque, pas un courtier.',
  'Le numéro RCCM et l’identifiant fiscal sont en cours de vérification et seront publiés dès confirmation.',
  'Pour toute question, écrivez à support@wariba.app.',
];

export default function MentionsLegalesPage() {
  return (
    <LegalPageShell
      title="Mentions légales"
      summary="Qui édite WARIBA, où l’opérateur est enregistré, et comment le contacter."
      lastUpdated="31 août 2026"
      toc={TOC}
      enClair={EN_CLAIR}
      sources={REGIONAL_SOURCES.filter((s) => s.id === 'ohada-societes')}
      related={[
        { href: '/legal/conditions-utilisation', label: 'Conditions d’utilisation' },
        { href: '/legal/trading-simule', label: 'Trading simulé' },
        { href: '/legal/reclamations-litiges', label: 'Réclamations et litiges' },
      ]}
    >
      <LegalSection id="editeur" number="1" title="Éditeur du service">
        <p>
          Le site wariba.app et les services WARIBA associés (ONE, FLEX, INSTANT, WARIBA Performance,
          WariX) sont édités par Lagoon Technologies.
        </p>
      </LegalSection>

      <LegalSection id="operateur" number="2" title="Opérateur">
        <p>
          Raison sociale&nbsp;: Lagoon Technologies. La forme juridique exacte (SARL, SA ou équivalent
          OHADA) n’est pas encore publiée sur ce site&nbsp;: elle sera ajoutée ici dès sa confirmation
          documentaire, conformément au droit des sociétés commerciales OHADA applicable en Côte
          d’Ivoire.
        </p>
      </LegalSection>

      <LegalSection id="siege" number="3" title="Siège et adresse">
        <p>Siège social&nbsp;: Abidjan, Côte d’Ivoire.</p>
        <LegalCallout tone="caution" title="Adresse complète en cours de vérification">
          L’adresse postale précise du siège n’est pas encore publiée. WARIBA n’affiche pas d’adresse
          approximative ou inventée à sa place — cette ligne sera complétée dès confirmation.
        </LegalCallout>
      </LegalSection>

      <LegalSection id="immatriculation" number="4" title="Immatriculation">
        <LegalCallout tone="caution" title="RCCM et identifiant fiscal non encore publiés">
          Le numéro de Registre du Commerce et du Crédit Mobilier (RCCM) et l’identifiant fiscal (NCC)
          de Lagoon Technologies ne sont pas encore confirmés dans les systèmes WARIBA. Aucun numéro
          n’est inventé pour combler cet espace&nbsp;: les deux identifiants seront publiés ici dès
          leur vérification documentaire.
        </LegalCallout>
      </LegalSection>

      <LegalSection id="contact" number="5" title="Contact">
        <p>
          Support et questions générales&nbsp;: support@wariba.app, ou via la page{' '}
          <a href="/contact" className="text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]">
            Contact
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="hebergeur" number="6" title="Hébergeur">
        <LegalCallout tone="caution" title="Nom de l’hébergeur en cours de confirmation">
          L’infrastructure technique de WARIBA est hébergée par un ou plusieurs prestataires cloud. Le
          nom et l’adresse exacts de l’hébergeur seront publiés ici dès confirmation interne, plutôt
          que devinés.
        </LegalCallout>
      </LegalSection>

      <LegalSection id="propriete-intellectuelle" number="7" title="Propriété intellectuelle">
        <p>
          Le nom WARIBA, son logo, son interface, ses contenus pédagogiques et l’environnement WariX
          sont la propriété de Lagoon Technologies ou de ses concédants. Toute reproduction, extraction
          ou réutilisation substantielle, sans autorisation écrite, est interdite.
        </p>
      </LegalSection>

      <LegalSection id="disponibilite" number="8" title="Disponibilité du site">
        <p>
          WARIBA s’efforce de maintenir le site et les services disponibles, sans garantir une
          disponibilité continue. Des interruptions pour maintenance, incident technique ou mise à
          jour peuvent survenir.
        </p>
      </LegalSection>

      <LegalSection id="nature-service" number="9" title="Nature du service WARIBA">
        <LegalCallout tone="info" title="La frontière centrale">
          WARIBA est un service numérique de simulation et d’évaluation de trading. Les comptes,
          ordres, tailles nominales et résultats WARIBA sont simulés. WARIBA ne collecte pas l’argent
          des utilisateurs pour l’investir, ne fournit pas de compte de courtage réel, ne gère pas de
          portefeuille client et ne fournit pas de conseil en investissement.
        </LegalCallout>
      </LegalSection>

      <LegalSection id="liens-externes" number="10" title="Liens externes">
        <p>
          Le site peut renvoyer vers des ressources tierces (prestataires de paiement, documentation
          externe). WARIBA n’exerce aucun contrôle sur le contenu de ces sites et n’en est pas
          responsable.
        </p>
      </LegalSection>

      <LegalSection id="droit-applicable" number="11" title="Droit applicable et contact juridique">
        <p>
          Le présent document est établi dans le cadre juridique de la Côte d’Ivoire et, pour les
          matières régionales, du cadre OHADA et UEMOA/UMOA applicable. Toute question d’ordre
          juridique peut être adressée à support@wariba.app.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
