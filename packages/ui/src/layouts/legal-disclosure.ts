/**
 * The public footer's regulatory disclosure content.
 *
 * ## Where this copy comes from
 *
 * Every word here is the owner's own drafted copy, not language this
 * codebase invented — deliberately built around what WARIBA's Product OS
 * already locks (V1 is simulated, the nominal is never presented as a
 * deposit, no automatic promise of real capital) and away from the one
 * finding the owner's own regulatory research turned up: AMF-UMOA has no
 * "prop firm" category, but reserves securities trading, order
 * transmission/execution, portfolio management and investment advice to
 * authorised actors, and separately prohibits implying an authorisation
 * that does not exist. The boundary these seven blocks draw — WARIBA sells
 * a simulated trading programme, not a brokerage, investment or advisory
 * service — is that finding turned into product-facing language.
 *
 * ## What this is not
 *
 * This is marketing-surface disclosure, not a legal opinion, and it does
 * not assert a regulatory conclusion ("WARIBA is unregulated", "WARIBA is
 * licensed in X") — the owner was explicit that neither claim is
 * supportable from this research alone. See
 * `docs/07-assurance/WARIBA_UEMOA_PUBLIC_FOOTER_COMPLIANCE_2026.md` for the
 * open legal gates this content does not close.
 */

export interface LegalDisclosure {
  id: string;
  title: string;
  body: string;
}

export const LEGAL_DISCLOSURES: readonly LegalDisclosure[] = [
  {
    id: 'operateur',
    title: 'Opérateur et nature du service',
    body: 'WARIBA est exploité par Lagoon Technologies, société enregistrée à Abidjan, Côte d’Ivoire. Sauf indication expresse contraire, les programmes WARIBA ONE, FLEX et INSTANT, les Évaluations, les comptes WARIBA Performance et les interfaces WariX proposés par WARIBA utilisent un environnement de trading simulé. Les tailles de compte affichées sont des tailles nominales simulées.',
  },
  {
    id: 'pas-un-depot',
    title: 'Pas un dépôt · Pas un service d’investissement',
    body: 'Les sommes payées à WARIBA correspondent à l’accès aux services et programmes concernés. Elles ne constituent ni un dépôt bancaire, ni un placement, ni des fonds confiés à WARIBA pour être investis. Les services WARIBA décrits ici ne constituent pas des services de courtage, de réception-transmission ou d’exécution d’ordres réels pour compte de tiers, de gestion de portefeuille ou de conseil en investissement. Aucun contenu du site ne constitue une recommandation d’achat ou de vente d’un instrument financier.',
  },
  {
    id: 'resultats-simules',
    title: 'Résultats simulés',
    body: 'Les résultats obtenus dans un environnement simulé ne constituent pas des résultats de trading réel. Une simulation peut ne pas reproduire intégralement des facteurs tels que liquidité, slippage, latence, exécution, profondeur de marché, pression psychologique et risque financier réel. Aucune représentation n’est faite selon laquelle un utilisateur obtiendra sur un marché réel des résultats similaires à ceux observés dans WARIBA.',
  },
  {
    id: 'payouts',
    title: 'Payouts',
    body: 'Les payouts WARIBA sont liés aux règles du programme simulé. Lorsqu’un compte devient prêt à demander selon les règles applicables, une demande peut être soumise et traitée conformément aux conditions du compte, aux vérifications d’identité ou de conformité applicables et au processus d’examen prévu. Un payout ne constitue ni un rendement sur investissement, ni un intérêt, ni un salaire, ni une promesse de revenu.',
  },
  {
    id: 'pas-de-conseil',
    title: 'Information · Pas de conseil',
    body: 'WARIBA ne fournit pas de conseil juridique, fiscal, comptable ou d’investissement. Le trading réel sur les marchés financiers comporte un risque de perte. Les résultats simulés WARIBA ne doivent pas être considérés comme une indication de performance future sur un compte réel.',
  },
  {
    id: 'juridictions',
    title: 'Disponibilité et juridictions',
    body: 'L’accès aux services WARIBA peut être soumis à des restrictions selon le pays de résidence, la capacité juridique de l’utilisateur, les exigences de vérification d’identité, de conformité, de paiement ou toute autre règle applicable. Les services disponibles et leurs conditions peuvent varier selon la juridiction.',
  },
  {
    id: 'paiements',
    title: 'Paiements',
    body: 'Les paiements peuvent être traités par des prestataires tiers et sont soumis aux conditions applicables au moyen de paiement utilisé.',
  },
] as const;

/**
 * Verified operator facts only — see the compliance memo for the fields
 * still missing (RCCM, NCC/tax identifier, exact legal form, full
 * registered office, registered capital). None of those are invented here;
 * they are simply absent from the public footer until sourced.
 */
export const LEGAL_OPERATOR = {
  legalName: 'Lagoon Technologies',
  registeredOffice: 'Abidjan, Côte d’Ivoire',
  supportEmail: 'support@wariba.app',
} as const;

/** Order matches `afrique-francophone-data.ts`'s `RIBBON_COUNTRIES` — one list, not a second one drifting out of sync. */
export const TARGET_MARKETS: readonly string[] = [
  'Côte d’Ivoire',
  'Sénégal',
  'Mali',
  'Burkina Faso',
  'Togo',
  'Bénin',
] as const;
