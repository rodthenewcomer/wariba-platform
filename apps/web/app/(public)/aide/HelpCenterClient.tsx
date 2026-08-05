'use client';

import { useMemo, useState } from 'react';

const FAQS = [
  {
    category: 'Commencer',
    question: 'WARIBA est-il un broker ou un compte financé réel ?',
    answer:
      'Non. WARIBA est un environnement de trading entièrement simulé. La balance nominale n’est ni un dépôt, ni du capital qui vous est confié, ni un compte de courtage.',
  },
  {
    category: 'Commencer',
    question: 'Quelles tailles sont disponibles ?',
    answer:
      'Les comptes 5K, 10K, 25K, 50K et 100K sont actifs pour la bêta privée. Leur ouverture commerciale publique reste décidée séparément et n’est pas garantie par cette disponibilité.',
  },
  {
    category: 'Prix et checkout',
    question: 'Pourquoi les prix sont-ils affichés en FCFA ?',
    answer:
      'Le FCFA est la devise commerciale principale et la devise de règlement. Le montant final est figé en FCFA au checkout. Tout équivalent USD reste informatif et le risque de change est porté par WARIBA.',
  },
  {
    category: 'Prix et checkout',
    question: 'Y a-t-il des frais d’activation après la réussite ?',
    answer:
      'Non. Les Rules v1.1 fixent les frais d’activation à zéro. Les prix restent candidats jusqu’à validation actuarielle et financière.',
  },
  {
    category: 'Evaluation',
    question: 'Comment atteindre l’objectif de 10 % ?',
    answer:
      'Seul le profit net réalisé compte. Le PnL latent ne compte pas. Pour passer, le trader doit également respecter la Best Day Rule, n’avoir aucune position ni ordre en attente et ne présenter aucun hard breach ou contrôle bloquant.',
  },
  {
    category: 'Evaluation',
    question: 'Existe-t-il un minimum de jours ?',
    answer:
      'Non. WARIBA ONE v1.1 n’impose aucun minimum de jours ni journée qualifiée. La Best Day Rule de 50 % empêche cependant un passage fondé sur une seule journée concentrée.',
  },
  {
    category: 'Risque',
    question: 'Que se passe-t-il si la Daily Loss Limit de 3 % est atteinte ?',
    answer:
      'Le compte entre en soft lock jusqu’au prochain reset UTC : les nouvelles expositions sont bloquées et les ordres en attente sont annulés selon la policy. Le compte n’est pas automatiquement terminé, sauf si le Maximum Loss est également atteint.',
  },
  {
    category: 'Risque',
    question: 'Comment fonctionne le Maximum Loss 10 % EOD trailing ?',
    answer:
      'Le plancher initial vaut 90 % du nominal. Il monte uniquement après une journée finalisée lorsque la plus haute balance EOD augmente, ne baisse jamais et se verrouille à la balance nominale. L’equity est surveillée en temps réel contre ce plancher.',
  },
  {
    category: 'Risque',
    question: 'La Best Day Rule au-dessus de 50 % termine-t-elle le compte ?',
    answer:
      'Non. Elle ne constitue jamais un breach. En Evaluation, elle bloque seulement le passage ; en Performance, elle bloque seulement l’éligibilité du cycle jusqu’au retour à 50 % ou moins.',
  },
  {
    category: 'WariX',
    question: 'Qu’est-ce que WariX ?',
    answer:
      'WariX est le terminal web de WARIBA. Il affiche le contexte du compte et permet les ordres de marché, la modification SL/TP sur une position ouverte, la clôture complète d’une position, ainsi que Close All.',
  },
  {
    category: 'WariX',
    question: 'Quels instruments sont disponibles ?',
    answer:
      'Les instruments disponibles sont EURUSD, GBPUSD, USDJPY, XAUUSD et NAS100. Le navigateur n’envoie jamais de prix autoritaire : le serveur seul décide du prix, du spread, du slippage et du fill.',
  },
  {
    category: 'Performance',
    question: 'Que signifie le buffer permanent de 10 % ?',
    answer:
      'Avant le premier payout, le trader construit une fois un buffer égal à 10 % du nominal. Il n’est jamais retirable et ne doit pas être reconstruit après chaque payout. Seul l’excédent réalisé au-dessus du buffer peut devenir éligible.',
  },
  {
    category: 'Performance',
    question: 'Que sont les Performance Days ?',
    answer:
      'Chaque payout exige cinq nouvelles journées UTC finalisées produisant chacune au moins 0,50 % du nominal en profit net réalisé. Elles ne doivent pas être consécutives, mais ne peuvent pas être réutilisées après un payout payé.',
  },
  {
    category: 'Performance',
    question: 'Un payout réel est-il garanti ?',
    answer:
      'Non. Le parcours actuel est entièrement simulé. Les caps, contrôles d’intégrité et conditions de lancement s’appliquent toujours. Aucun sixième payout ni compte Live n’est automatiquement garanti après Review.',
  },
] as const;

const CATEGORIES = [
  'Tous',
  'Commencer',
  'Prix et checkout',
  'Evaluation',
  'Risque',
  'WariX',
  'Performance',
] as const;

export function HelpCenterClient() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Tous');
  const normalizedQuery = query.trim().toLocaleLowerCase('fr');
  const results = useMemo(
    () =>
      FAQS.filter(
        (faq) =>
          (category === 'Tous' || faq.category === category) &&
          (!normalizedQuery ||
            `${faq.question} ${faq.answer} ${faq.category}`
              .toLocaleLowerCase('fr')
              .includes(normalizedQuery)),
      ),
    [category, normalizedQuery],
  );

  return (
    <div>
      <label
        htmlFor="help-search"
        className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-ink-300)]"
      >
        Rechercher dans les réponses
      </label>
      <input
        id="help-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Ex. Maximum Loss, FCFA, WariX…"
        className="mt-3 min-h-14 w-full rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-color-ink-600)] bg-[color:var(--wariba-color-ink-900)] px-4 text-[length:var(--wariba-font-size-body-md)] text-[color:var(--wariba-color-bone-50)] placeholder:text-[color:var(--wariba-color-ink-300)]"
      />
      <div className="mt-5 flex flex-wrap gap-2" aria-label="Catégories d’aide">
        {CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            aria-pressed={category === item}
            className={`min-h-11 rounded-[var(--wariba-radius-full)] border px-4 text-[length:var(--wariba-font-size-label-sm)] font-semibold ${
              category === item
                ? 'border-[color:var(--wariba-color-cobalt-300)] bg-[color:var(--wariba-color-cobalt-900)] text-[color:var(--wariba-color-bone-50)]'
                : 'border-[color:var(--wariba-color-ink-600)] text-[color:var(--wariba-color-ink-100)] hover:bg-[color:var(--wariba-color-ink-800)]'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        {results.map((faq) => (
          <details
            key={faq.question}
            className="group rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-color-ink-700)] bg-[color:var(--wariba-color-ink-900)] p-5 open:bg-[color:var(--wariba-color-ink-800)]"
          >
            <summary className="min-h-11 cursor-pointer pr-4 text-[length:var(--wariba-font-size-heading-sm)] font-semibold text-[color:var(--wariba-color-bone-50)]">
              {faq.question}
            </summary>
            <p className="mt-4 border-t border-[color:var(--wariba-color-ink-600)] pt-4 text-[length:var(--wariba-font-size-body-sm)] leading-[var(--wariba-line-height-body-md)] text-[color:var(--wariba-color-ink-200)]">
              {faq.answer}
            </p>
            <p className="mt-4 text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-cobalt-300)]">
              {faq.category}
            </p>
          </details>
        ))}
      </div>

      {results.length === 0 && (
        <div className="mt-10 rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-color-ink-700)] p-8 text-center">
          <p className="font-semibold text-[color:var(--wariba-color-bone-50)]">
            Aucun résultat pour cette recherche.
          </p>
          <p className="mt-2 text-[color:var(--wariba-color-ink-300)]">
            Essayez un autre terme ou choisissez « Tous ».
          </p>
        </div>
      )}
    </div>
  );
}
