import { LegalPageShell } from '../../../../components/legal/LegalPageShell';
import { LegalSection } from '../../../../components/legal/LegalSection';
import { LegalCallout } from '../../../../components/legal/LegalCallout';
import { REGIONAL_SOURCES } from '../../../../components/legal/legal-sources';
import { NOMINAL_SIZE_SEPARATION_STATEMENT } from '../../../../components/legal/legal-payment-architecture';

const TOC = [
  { id: 'compte-simule', label: 'Compte simulé' },
  { id: 'taille-nominale', label: 'Taille nominale' },
  { id: 'ordres-simules', label: 'Ordres simulés' },
  { id: 'warix', label: 'WariX' },
  { id: 'evaluation', label: 'Évaluation' },
  { id: 'performance', label: 'Performance' },
  { id: 'difference-reel', label: 'Différence avec le réel' },
  { id: 'pression-psychologique', label: 'Pression psychologique' },
  { id: 'resultats-simules', label: 'Résultats simulés' },
  { id: 'absence-capital', label: 'Absence de capital client' },
  { id: 'payouts-contractuels', label: 'Payouts contractuels' },
  { id: 'pas-de-garantie', label: 'Pas de garantie future' },
] as const;

const EN_CLAIR = [
  'WARIBA simule le trading. WARIBA ne vous confie pas un capital réel à investir.',
  'La taille de compte affichée est nominale — elle ne représente pas un dépôt.',
  'Une simulation ne reproduit pas exactement liquidité, slippage, latence et exécution réels.',
  'Un résultat simulé n’indique pas ce qu’un résultat réel serait sur un marché réel.',
];

function DistinctionRail() {
  return (
    <div className="rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-brand-edge)] bg-[color:var(--wariba-brand-wash)] px-5 py-6">
      <p className="text-[length:var(--wariba-font-size-heading-sm)] font-semibold leading-tight text-[color:var(--wariba-on-dark)]">
        Compte simulé
        <br />
        <span className="text-[color:var(--wariba-on-dark-dim)]">≠</span>
        <br />
        Capital réel
      </p>
      <p className="mt-4 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
        Cette distinction gouverne l’intégralité de cette page. Elle ne varie ni par parcours (ONE,
        FLEX, INSTANT) ni par phase (Évaluation, Performance).
      </p>
    </div>
  );
}

export default function TradingSimulePage() {
  return (
    <LegalPageShell
      title="Disclosure sur le trading simulé"
      summary="WARIBA simule le trading. WARIBA ne vous confie pas un capital réel à investir."
      lastUpdated="31 août 2026"
      toc={TOC}
      enClair={EN_CLAIR}
      sources={REGIONAL_SOURCES.filter((s) => s.id === 'amf-umoa-reglement')}
      rail={<DistinctionRail />}
      related={[
        { href: '/legal/risques', label: 'Risques et règles de trading' },
        { href: '/legal/payouts', label: 'Payouts' },
        { href: '/legal/conditions-utilisation', label: 'Conditions d’utilisation' },
      ]}
    >
      <LegalSection id="compte-simule" number="1" title="Qu’est-ce qu’un compte simulé ?">
        <p>
          Un compte WARIBA — Évaluation ou Performance — exécute des ordres dans un environnement de
          marché simulé. Aucune somme n’est déposée sur un compte de courtage réel au nom de
          l’utilisateur.
        </p>
      </LegalSection>

      <LegalSection id="taille-nominale" number="2" title="Taille nominale">
        <p>
          La « taille de compte » affichée (par exemple 25K, 50K, 100K) est une taille nominale
          utilisée pour calculer les règles et les résultats simulés. Elle ne constitue ni un dépôt, ni
          un solde bancaire, ni des fonds confiés à WARIBA.
        </p>
        <LegalCallout tone="info" title="Aucun lien patrimonial">
          {NOMINAL_SIZE_SEPARATION_STATEMENT}
        </LegalCallout>
      </LegalSection>

      <LegalSection id="ordres-simules" number="3" title="Ordres simulés">
        <p>
          Les ordres passés sur un compte WARIBA sont exécutés contre un moteur de simulation, pas sur
          un marché réel ni via un courtier tiers exécutant pour le compte de l’utilisateur.
        </p>
      </LegalSection>

      <LegalSection id="warix" number="4" title="WariX">
        <p>
          WariX est l’interface de trading utilisée pour visualiser les prix simulés et passer des
          ordres simulés. Le prix affiché sur le graphique ne constitue pas une garantie d’exécution
          exacte.
        </p>
      </LegalSection>

      <LegalSection id="evaluation" number="5" title="Évaluation">
        <p>
          Une Évaluation (ONE ou l’étape équivalente de FLEX) mesure si un utilisateur atteint un
          objectif de performance simulé dans le respect des règles de risque du programme.
        </p>
      </LegalSection>

      <LegalSection id="performance" number="6" title="Performance">
        <p>
          Un compte WARIBA Performance reste un environnement simulé. Il ne devient pas, à un moment
          quelconque du cycle, un compte de courtage réel.
        </p>
      </LegalSection>

      <LegalSection id="difference-reel" number="7" title="Différence avec le trading réel">
        <ul>
          <li>
            <strong>Liquidité et profondeur de marché</strong> — un environnement simulé ne reproduit
            pas nécessairement le carnet d’ordres réel d’un marché.
          </li>
          <li>
            <strong>Slippage et latence</strong> — le modèle de slippage simulé peut différer d’une
            exécution réelle.
          </li>
          <li>
            <strong>Exécution</strong> — l’exécution simulée est déterministe selon le moteur WARIBA,
            pas soumise aux mêmes aléas qu’un marché réel.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="pression-psychologique" number="8" title="Pression psychologique">
        <p>
          Le trading réel comporte une pression psychologique liée à l’engagement d’un capital
          personnel réel. Cette pression n’est pas nécessairement reproduite à l’identique dans un
          environnement simulé.
        </p>
      </LegalSection>

      <LegalSection id="resultats-simules" number="9" title="Résultats simulés">
        <p>
          Les résultats obtenus dans WARIBA ne constituent pas des résultats de trading réel et ne
          doivent pas être présentés comme tels par l’utilisateur.
        </p>
      </LegalSection>

      <LegalSection id="absence-capital" number="10" title="Absence de capital client">
        <LegalCallout tone="info" title="Aucun capital client géré">
          WARIBA ne reçoit, ne détient ni ne gère de capital client destiné à être investi sur un
          marché réel.
        </LegalCallout>
      </LegalSection>

      <LegalSection id="payouts-contractuels" number="11" title="Payouts contractuels">
        <p>
          Un payout WARIBA, lorsque les conditions du compte sont remplies, est un versement
          contractuel lié aux règles du programme — pas un retrait de capital investi. Voir{' '}
          <a href="/legal/payouts" className="text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]">
            Payouts
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="pas-de-garantie" number="12" title="Pas de performance future garantie">
        <p>
          Aucune représentation n’est faite selon laquelle un résultat obtenu dans WARIBA se
          reproduirait sur un marché réel, ni qu’une performance simulée passée indique une performance
          future.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
