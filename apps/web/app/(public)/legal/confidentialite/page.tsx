import { LegalPageShell } from '../../../../components/legal/LegalPageShell';
import { LegalSection } from '../../../../components/legal/LegalSection';
import { LegalCallout } from '../../../../components/legal/LegalCallout';
import { COUNTRY_SOURCES, PRIVACY_SOURCES } from '../../../../components/legal/legal-sources';

const TOC = [
  { id: 'responsable', label: 'Responsable du traitement' },
  { id: 'donnees-collectees', label: 'Données collectées' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'finalites', label: 'Pourquoi ces données' },
  { id: 'prestataires', label: 'Prestataires' },
  { id: 'transferts', label: 'Transferts internationaux' },
  { id: 'conservation', label: 'Conservation' },
  { id: 'droits', label: 'Vos droits' },
  { id: 'autorites', label: 'Autorités par pays' },
  { id: 'incidents', label: 'Incidents de sécurité' },
  { id: 'mineurs', label: 'Mineurs' },
  { id: 'modifications', label: 'Modifications' },
] as const;

const EN_CLAIR = [
  'WARIBA collecte les données nécessaires à votre compte, votre sécurité et vos obligations de conformité.',
  'WARIBA ne vend pas vos données et n’en invente pas un usage commercial hors de ce cadre.',
  'Aucun outil de suivi publicitaire tiers (Google Analytics, Meta Pixel, etc.) n’est installé sur WARIBA à ce jour.',
  'Vous pouvez demander l’accès, la rectification ou d’autres droits applicables via une procédure authentifiée.',
];

export default function ConfidentialitePage() {
  return (
    <LegalPageShell
      title="Politique de confidentialité"
      summary="Vos données, en clair : ce que WARIBA collecte, pourquoi, et comment les faire valoir."
      lastUpdated="31 août 2026"
      toc={TOC}
      enClair={EN_CLAIR}
      sources={PRIVACY_SOURCES}
      related={[
        { href: '/legal/cookies', label: 'Cookies' },
        { href: '/legal/lbc-kyc', label: 'LBC / KYC' },
        { href: '/legal/mentions-legales', label: 'Mentions légales' },
      ]}
    >
      <LegalSection id="responsable" number="1" title="Responsable du traitement">
        <p>
          Le responsable du traitement des données personnelles collectées par WARIBA est Lagoon
          Technologies. Voir les{' '}
          <a
            href="/legal/mentions-legales"
            className="text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]"
          >
            mentions légales
          </a>{' '}
          pour son identité complète.
        </p>
      </LegalSection>

      <LegalSection id="donnees-collectees" number="2" title="Données collectées">
        <ul>
          <li>Identité de compte et contact (nom, e-mail).</li>
          <li>
            Données de vérification d’identité (KYC), lorsqu’une demande de payout la requiert.
          </li>
          <li>Métadonnées de paiement et de transaction (référence, statut, prestataire).</li>
          <li>Activité de trading et de simulation sur le compte.</li>
          <li>Télémétrie WariX nécessaire au fonctionnement du terminal.</li>
          <li>
            Journaux techniques de sécurité (appareil, adresse IP, événements d’authentification).
          </li>
          <li>Demandes de support, contestations et dossiers de conformité.</li>
        </ul>
      </LegalSection>

      <LegalSection id="cookies" number="3" title="Cookies">
        <p>
          WARIBA utilise des cookies strictement nécessaires à l’authentification et à la sécurité
          de la session. Voir la page{' '}
          <a
            href="/legal/cookies"
            className="text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]"
          >
            Cookies
          </a>{' '}
          pour l’inventaire complet et à jour.
        </p>
      </LegalSection>

      <LegalSection id="finalites" number="4" title="Pourquoi ces données sont utilisées">
        <p>
          Fournir le compte et le service souscrit, appliquer les règles du programme, prévenir la
          fraude, répondre aux réclamations, sécuriser la plateforme et respecter les obligations
          légales applicables (y compris KYC et LBC/FT/FP le cas échéant). WARIBA ne se donne pas
          d’usage commercial de ces données en dehors de ce cadre.
        </p>
      </LegalSection>

      <LegalSection id="prestataires" number="5" title="Prestataires">
        <p>
          Certaines données peuvent être partagées avec des prestataires nécessaires au
          service&nbsp;: prestataires de paiement, hébergement cloud, et, lorsqu’un fournisseur KYC
          est intégré, un prestataire de vérification d’identité. Aucune donnée n’est partagée à des
          fins publicitaires tierces.
        </p>
      </LegalSection>

      <LegalSection id="transferts" number="6" title="Transferts internationaux">
        <p>
          Lorsque des données doivent être transférées hors de votre pays — par exemple vers un
          prestataire cloud ou de paiement situé ailleurs — WARIBA applique les exigences prévues
          par la loi applicable, y compris les autorisations, formalités ou garanties requises.
        </p>
      </LegalSection>

      <LegalSection id="conservation" number="7" title="Conservation">
        <p>
          Les données sont conservées le temps nécessaire à la fourniture du service, au respect des
          obligations légales applicables (notamment en matière de conformité financière) et à la
          gestion des réclamations, puis supprimées ou anonymisées selon les règles internes de
          rétention.
        </p>
      </LegalSection>

      <LegalSection id="droits" number="8" title="Vos droits">
        <p>
          Selon la loi applicable à votre pays de résidence, vous pouvez disposer d’un droit
          d’accès, de rectification, de suppression (lorsqu’applicable), d’opposition, et de retrait
          du consentement lorsqu’un traitement en dépend. Une procédure authentifiée permet
          d’exercer ces droits, sans supprimer les preuves que WARIBA doit légalement ou
          contractuellement conserver.
        </p>
      </LegalSection>

      <LegalSection id="autorites" number="9" title="Autorités de protection des données par pays">
        <ul>
          {COUNTRY_SOURCES.map((c) => (
            <li key={c.country}>
              <strong>{c.country}</strong> — {c.authority}
            </li>
          ))}
        </ul>
        <LegalCallout tone="caution" title="Formalités en cours de cartographie">
          Les formalités préalables (enregistrement, déclaration ou autorisation) auprès de ces
          autorités ne sont pas toutes confirmées comme complètes à ce jour. Voir le mémo de
          conformité interne pour l’état exact, marché par marché.
        </LegalCallout>
      </LegalSection>

      <LegalSection id="incidents" number="10" title="Incidents de sécurité">
        <p>
          En cas d’incident de sécurité affectant des données personnelles, WARIBA prend les mesures
          nécessaires pour limiter l’impact et informe les personnes concernées et, lorsque la loi
          l’exige, l’autorité compétente.
        </p>
      </LegalSection>

      <LegalSection id="mineurs" number="11" title="Mineurs">
        <p>
          WARIBA n’est pas destiné aux personnes n’ayant pas atteint la majorité légale dans leur
          pays de résidence. Voir{' '}
          <a
            href="/legal/conditions-utilisation"
            className="text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]"
          >
            Conditions d’utilisation
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="modifications" number="12" title="Modifications">
        <p>
          Cette politique peut être mise à jour. La date de dernière mise à jour, en haut de cette
          page, reflète la version en vigueur.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
