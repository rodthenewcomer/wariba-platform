import { LegalPageShell } from '../../../../components/legal/LegalPageShell';
import { LegalSection } from '../../../../components/legal/LegalSection';
import { LegalCallout } from '../../../../components/legal/LegalCallout';
import { REGIONAL_SOURCES } from '../../../../components/legal/legal-sources';

const TOC = [
  { id: 'definition', label: 'Qu’est-ce qu’un cookie' },
  { id: 'necessaires', label: 'Cookies nécessaires' },
  { id: 'analytics-marketing', label: 'Analytics et marketing' },
  { id: 'tiers', label: 'Cookies tiers au paiement' },
  { id: 'inventaire', label: 'Inventaire actuel' },
  { id: 'consentement', label: 'Consentement et contrôle' },
  { id: 'mises-a-jour', label: 'Mises à jour' },
] as const;

const EN_CLAIR = [
  'WARIBA n’utilise aujourd’hui que des cookies strictement nécessaires à l’authentification et à la sécurité.',
  'Aucun cookie analytics (Google Analytics, etc.) ni publicitaire (Meta Pixel, TikTok Pixel, etc.) n’est installé.',
  'Un prestataire de paiement peut poser ses propres cookies pendant le passage au paiement — hors du contrôle direct de WARIBA.',
  'Si un cookie non essentiel était ajouté à l’avenir, il serait soumis au consentement de l’utilisateur.',
];

export default function CookiesPage() {
  return (
    <LegalPageShell
      title="Politique relative aux cookies"
      summary="L’inventaire réel des cookies utilisés par WARIBA — pas une liste de catégories génériques."
      lastUpdated="31 août 2026"
      toc={TOC}
      enClair={EN_CLAIR}
      sources={REGIONAL_SOURCES.filter((s) => s.id === 'uemoa-directive-consommateur')}
      related={[
        { href: '/legal/confidentialite', label: 'Confidentialité' },
        { href: '/legal/mentions-legales', label: 'Mentions légales' },
      ]}
    >
      <LegalSection id="definition" number="1" title="Qu’est-ce qu’un cookie ?">
        <p>
          Un cookie est un petit fichier déposé par un site dans le navigateur, utilisé pour
          reconnaître une session ou mémoriser une préférence.
        </p>
      </LegalSection>

      <LegalSection id="necessaires" number="2" title="Cookies nécessaires">
        <p>
          WARIBA utilise un cookie de session d’authentification, géré par notre fournisseur
          d’infrastructure (Supabase), pour vous maintenir connecté et sécuriser votre session. Sans
          ce cookie, l’accès à votre compte n’est pas possible.
        </p>
      </LegalSection>

      <LegalSection id="analytics-marketing" number="3" title="Analytics et marketing">
        <LegalCallout tone="verified" title="Aucun cookie de suivi installé à ce jour">
          À la date de cette page, WARIBA n’installe aucun cookie Google Analytics, Meta Pixel,
          TikTok Pixel, Hotjar ou équivalent. Cette section sera mise à jour si un outil de mesure
          est ajouté — jamais silencieusement.
        </LegalCallout>
      </LegalSection>

      <LegalSection id="tiers" number="4" title="Cookies tiers au paiement">
        <p>
          Lors d’un paiement, le prestataire de paiement tiers peut poser ses propres cookies
          techniques ou de sécurité, en dehors du contrôle direct de WARIBA, selon sa propre
          politique.
        </p>
      </LegalSection>

      <LegalSection id="inventaire" number="5" title="Inventaire actuel">
        <div className="overflow-x-auto rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-seam)]">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[color:var(--wariba-seam)] bg-[color:var(--wariba-canvas-elevated)]">
                <th className="px-4 py-3 font-semibold text-[color:var(--wariba-on-dark)]">
                  Catégorie
                </th>
                <th className="px-4 py-3 font-semibold text-[color:var(--wariba-on-dark)]">
                  Finalité
                </th>
                <th className="px-4 py-3 font-semibold text-[color:var(--wariba-on-dark)]">
                  Durée
                </th>
                <th className="px-4 py-3 font-semibold text-[color:var(--wariba-on-dark)]">
                  Nécessaire
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-3 text-[color:var(--wariba-on-dark-muted)]">
                  Session / authentification
                </td>
                <td className="px-4 py-3 text-[color:var(--wariba-on-dark-muted)]">
                  Maintenir la connexion et sécuriser la session
                </td>
                <td className="px-4 py-3 text-[color:var(--wariba-on-dark-muted)]">
                  Durée de la session
                </td>
                <td className="px-4 py-3 text-[color:var(--wariba-accent-emerald)]">Oui</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-[color:var(--wariba-on-dark-muted)]">Analytics</td>
                <td className="px-4 py-3 text-[color:var(--wariba-on-dark-muted)]">—</td>
                <td className="px-4 py-3 text-[color:var(--wariba-on-dark-muted)]">—</td>
                <td className="px-4 py-3 text-[color:var(--wariba-on-dark-dim)]">Aucun installé</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-[color:var(--wariba-on-dark-muted)]">
                  Marketing / publicité
                </td>
                <td className="px-4 py-3 text-[color:var(--wariba-on-dark-muted)]">—</td>
                <td className="px-4 py-3 text-[color:var(--wariba-on-dark-muted)]">—</td>
                <td className="px-4 py-3 text-[color:var(--wariba-on-dark-dim)]">Aucun installé</td>
              </tr>
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection id="consentement" number="6" title="Consentement et contrôle">
        <p>
          Les cookies strictement nécessaires ne requièrent pas de consentement séparé, car ils sont
          indispensables au service demandé. Tout cookie non essentiel ajouté à l’avenir serait
          soumis au consentement préalable de l’utilisateur, retirable à tout moment. Vous pouvez
          également bloquer ou supprimer les cookies via les réglages de votre navigateur.
        </p>
      </LegalSection>

      <LegalSection id="mises-a-jour" number="7" title="Mises à jour">
        <p>
          Cet inventaire est tenu à jour à chaque évolution technique. La date de dernière mise à
          jour, en haut de cette page, reflète l’état réel du site à cette date.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
