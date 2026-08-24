/**
 * WARIBA's help content, in one place.
 *
 * ## Why this moved
 *
 * These answers used to live inside `HelpCenterClient.tsx`. That was fine while
 * `/aide` was the only surface that had them; Phase 3.2 gives an authenticated
 * trader a Support home that has to search the same answers, and two copies of
 * a rulebook explanation is how a product ends up telling one person the
 * Maximum Loss floor ratchets and another that it does not.
 *
 * ## Still static, deliberately
 *
 * `HELP_ARTICLE_DATABASE = deferred`. There is no `help_articles` table, no
 * versioning and no CMS, because none of that is what a private beta is
 * blocked on — a trader who cannot open a support request is. What Phase 3.2
 * owed the Help Center was that its search keeps working and that the path
 * from an unanswered question to a real ticket is one click; both are true
 * without persistence. Article storage returns when help content needs to
 * change without a deploy, which is a different problem than this slice's.
 *
 * The set below is byte-identical to what `/aide` already served.
 */

export interface HelpArticle {
  category: HelpCategory;
  question: string;
  answer: string;
}

export type HelpCategory =
  'Commencer' | 'Prix et checkout' | 'Evaluation' | 'Risque' | 'WariX' | 'Performance';

export const HELP_ARTICLES: readonly HelpArticle[] = [
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
      'WariX est le terminal web de WARIBA. Il affiche le contexte du compte et permet les ordres de marché, la modification SL/TP sur une position ouverte (directement sur le graphique par glissement, saisie de prix exact ou menu contextuel), la clôture partielle ou complète d’une position, ainsi que Close All.',
  },
  {
    category: 'WariX',
    question: 'Quels instruments sont disponibles ?',
    answer:
      'Les instruments disponibles sont EURUSD, GBPUSD, USDJPY, XAUUSD et NAS100. Le navigateur n’envoie jamais de prix autoritaire : le serveur seul décide du prix, du spread, du slippage et du fill.',
  },
  {
    category: 'WariX',
    question: 'Puis-je placer un ordre en attente (Limit ou Stop) ?',
    answer:
      'Oui. Depuis le ticket d’ordre ou le menu contextuel du graphique, vous pouvez créer un ordre Achat/Vente Limit ou Stop avec un Stop Loss et un Take Profit optionnels attachés dès la création. L’ordre reste actif (GTC) jusqu’à déclenchement ou annulation et se déclenche sur un prix réel du serveur, jamais sur un prix affiché côté navigateur.',
  },
  {
    category: 'WariX',
    question: 'Comment fonctionnent les alertes de prix ?',
    answer:
      'Une alerte se déclenche lorsque le prix franchit un seuil que vous définissez (au-dessus ou en dessous), évaluée en continu côté serveur sur le prix réel. Elle apparaît dans le centre de notifications dès son déclenchement et peut être configurée pour se répéter ou ne se déclencher qu’une seule fois.',
  },
  {
    category: 'WariX',
    question: 'WariX fonctionne-t-il sur mobile ?',
    answer:
      'Oui. Un appui long sur le graphique ouvre le même menu d’actions que le clic droit sur ordinateur, dans une feuille tactile adaptée au doigt : achat/vente au marché, ordre en attente, création d’alerte et actions de gestion de position disponibles selon le contexte.',
  },
  {
    category: 'WariX',
    question: 'Comment clôturer une partie seulement d’une position ?',
    answer:
      'Depuis le graphique (menu au clic droit ou bouton « Clôture % » sur la position), l’onglet Positions, ou le menu de gestion de la ligne de position : choisissez 25 %, 50 %, 75 % ou une quantité personnalisée, puis confirmez. Le reste de la position demeure ouvert. Si le prix du marché est momentanément obsolète, la demande est mise en file et exécutée automatiquement dès qu’un prix à jour redevient disponible — jamais contre un ancien prix.',
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
];

/** Category chips, in reading order. `Tous` is a filter, not a category. */
export const HELP_CATEGORIES = [
  'Tous',
  'Commencer',
  'Prix et checkout',
  'Evaluation',
  'Risque',
  'WariX',
  'Performance',
] as const;

export type HelpFilter = (typeof HELP_CATEGORIES)[number];

/**
 * The one search both surfaces use.
 *
 * Substring matching over question, answer and category, French-normalised.
 * Not fuzzy, not ranked, and not pretending to be: with twenty articles a
 * ranked search would be inventing relevance it cannot measure. It runs the
 * same way on the marketing Help Center and inside the Trader Hub, so a term
 * that finds an answer in one finds it in the other.
 */
export function searchHelpArticles(
  query: string,
  category: HelpFilter = 'Tous',
): readonly HelpArticle[] {
  const normalized = query.trim().toLocaleLowerCase('fr');
  return HELP_ARTICLES.filter(
    (article) =>
      (category === 'Tous' || article.category === category) &&
      (!normalized ||
        `${article.question} ${article.answer} ${article.category}`
          .toLocaleLowerCase('fr')
          .includes(normalized)),
  );
}
