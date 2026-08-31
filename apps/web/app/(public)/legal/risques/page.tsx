import { LegalPageShell } from '../../../../components/legal/LegalPageShell';
import { LegalSection } from '../../../../components/legal/LegalSection';
import { LegalCallout } from '../../../../components/legal/LegalCallout';
import { REGIONAL_SOURCES } from '../../../../components/legal/legal-sources';

const TOC = [
  { id: 'nature-risques', label: 'Nature des risques' },
  { id: 'risque-reel', label: 'Risque en trading réel' },
  { id: 'simulation-vs-marche', label: 'Simulation ≠ marché réel' },
  { id: 'objectifs', label: 'Objectifs de performance' },
  { id: 'daily-loss', label: 'Perte quotidienne' },
  { id: 'maximum-loss', label: 'Perte maximale' },
  { id: 'blocages', label: 'Blocages temporaires' },
  { id: 'fin-compte', label: 'Fin de compte possible' },
  { id: 'volatilite', label: 'Volatilité, gap, slippage' },
  { id: 'risque-technique', label: 'Risque technique' },
  { id: 'regles-par-compte', label: 'Règles par compte' },
  { id: 'pas-de-conseil', label: 'Pas de conseil' },
  { id: 'pas-de-garantie-avenir', label: 'Pas de garantie future' },
] as const;

const EN_CLAIR = [
  'Les limites WARIBA sont des règles du programme simulé, pas des mesures de risque de marché réel.',
  'La perte quotidienne bloque de nouvelles positions jusqu’au prochain reset, sans terminer le compte.',
  'La perte maximale, elle, met fin au compte.',
  'Le trading réel comporte un risque de perte que la simulation ne représente pas fidèlement.',
];

export default function RisquesPage() {
  return (
    <LegalPageShell
      title="Risques et règles de trading"
      summary="Les limites WARIBA sont des règles du programme simulé — pas une mesure de risque de marché réel."
      lastUpdated="31 août 2026"
      toc={TOC}
      enClair={EN_CLAIR}
      sources={REGIONAL_SOURCES.filter((s) => s.id === 'amf-umoa-reglement')}
      related={[
        { href: '/legal/trading-simule', label: 'Trading simulé' },
        { href: '/legal/payouts', label: 'Payouts' },
        { href: '/aide/risque-regles', label: 'Centre d’aide — Règles' },
      ]}
    >
      <LegalSection id="nature-risques" number="1" title="Nature des risques">
        <p>
          Deux catégories de risque distinctes s’appliquent à un compte WARIBA&nbsp;: le risque
          contractuel/opérationnel propre au programme (règles pouvant bloquer ou terminer un
          compte), et le risque financier réel, qui ne s’applique pas directement à un environnement
          simulé mais reste réel si l’utilisateur applique ce qu’il apprend sur un marché réel
          ailleurs.
        </p>
      </LegalSection>

      <LegalSection id="risque-reel" number="2" title="Risque de perte en trading réel">
        <p>
          Le trading réel sur les marchés financiers comporte un risque de perte, pouvant aller
          jusqu’à la perte totale du capital engagé. WARIBA ne gère pas ce risque pour le compte de
          l’utilisateur, puisqu’aucun capital réel n’est engagé dans l’environnement WARIBA
          lui-même.
        </p>
      </LegalSection>

      <LegalSection id="simulation-vs-marche" number="3" title="Simulation ≠ marché réel">
        <p>
          Les spreads, slippages, liquidités et comportements de l’environnement simulé sont
          déterministes et peuvent différer d’un marché réel. Une performance simulée ne garantit
          aucun résultat futur, sur WARIBA ou ailleurs.
        </p>
      </LegalSection>

      <LegalSection id="objectifs" number="4" title="Objectifs de performance">
        <p>
          Chaque parcours (ONE, FLEX, INSTANT) définit un objectif de performance simulé et des
          règles de risque associées, publiés avant l’achat et attachés au compte au moment de la
          commande.
        </p>
      </LegalSection>

      <LegalSection id="daily-loss" number="5" title="Perte quotidienne">
        <p>
          La règle de perte quotidienne bloque l’ouverture de nouvelles positions jusqu’au prochain
          reset du compte, sans mettre fin au compte lui-même.
        </p>
      </LegalSection>

      <LegalSection id="maximum-loss" number="6" title="Perte maximale">
        <p>
          La règle de perte maximale, si elle est atteinte, met fin au compte concerné selon les
          conditions publiées pour le programme souscrit.
        </p>
      </LegalSection>

      <LegalSection id="blocages" number="7" title="Blocages temporaires">
        <p>
          Certaines règles (par exemple une règle liée au meilleur jour de performance) peuvent
          retarder un passage d’étape ou un cycle de payout sans jamais, à elles seules, mettre fin
          au compte.
        </p>
      </LegalSection>

      <LegalSection id="fin-compte" number="8" title="Fin de compte possible">
        <LegalCallout tone="caution" title="Une règle atteinte peut mettre fin au compte">
          Certaines règles, notamment la perte maximale, mettent fin définitivement au compte
          concerné lorsqu’elles sont atteintes. Ce n’est pas une pénalité arbitraire&nbsp;: c’est la
          règle publiée et acceptée avant l’achat qui s’applique.
        </LegalCallout>
      </LegalSection>

      <LegalSection id="volatilite" number="9" title="Volatilité, gap et slippage simulé">
        <p>
          Le moteur de simulation applique un modèle de spread et de slippage propre à WARIBA. Ce
          modèle ne reproduit pas nécessairement la volatilité, les gaps ou le slippage d’un marché
          réel au moment considéré.
        </p>
      </LegalSection>

      <LegalSection id="risque-technique" number="10" title="Risque technique">
        <p>
          Une interruption de service, une panne d’un prestataire tiers, ou un problème de connexion
          internet ou d’appareil côté utilisateur peut affecter l’accès au compte. L’utilisateur
          reste responsable de la fiabilité de sa propre connexion et de son propre appareil.
        </p>
      </LegalSection>

      <LegalSection id="regles-par-compte" number="11" title="Règles par compte">
        <p>
          Les règles applicables à un compte sont celles publiées et attachées à ce compte au moment
          de l’achat (« rule snapshot »)&nbsp;: une évolution ultérieure de la policy générale
          WARIBA ne modifie pas rétroactivement les règles d’un compte déjà créé.
        </p>
      </LegalSection>

      <LegalSection id="pas-de-conseil" number="12" title="Pas de conseil en investissement">
        <p>
          WARIBA ne fournit pas de conseil en investissement. Aucun contenu du site ou de
          l’application ne constitue une recommandation d’achat ou de vente d’un instrument
          financier réel.
        </p>
      </LegalSection>

      <LegalSection
        id="pas-de-garantie-avenir"
        number="13"
        title="Pas de représentation de performance future"
      >
        <p>
          WARIBA Review — l’étape suivant la fin d’un cycle de payouts — n’entraîne pas
          automatiquement un capital réel, une relation d’emploi, une gestion de fonds ou une
          allocation Live.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
