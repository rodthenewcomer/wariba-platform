import type { HelpPolicyFacts } from '@wariba/application';
import { HELP_FACT_UNPUBLISHED } from '@wariba/application';
import {
  AnnotatedProductScreenshot,
  HELP_DYNAMIC_VISUAL_IDS,
  HelpVisual,
  type HelpDynamicVisualId,
  type HelpP0VisualId,
  type HelpScreenshotVisualId,
  type HelpVisualFacts,
  type HelpVisualModel,
  type ProductScreenshotModel,
} from '@wariba/ui';

type VisualCopy = Pick<HelpVisualModel, 'title' | 'summary' | 'textEquivalent'>;

const DYNAMIC_COPY: Record<HelpDynamicVisualId, VisualCopy> = {
  'HLP-VIS-001': {
    title: 'Temporaire ou définitif : deux limites, deux conséquences',
    summary:
      'La perte quotidienne protège une journée. La perte maximale protège le compte dans la durée.',
    textEquivalent:
      'La perte quotidienne suspend les nouvelles positions jusqu’au reset sans terminer le compte. La perte maximale suit un plancher qui ne redescend pas et son franchissement termine le compte.',
  },
  'HLP-VIS-002': {
    title: 'Pourquoi votre plancher remonte après une bonne journée',
    summary:
      'La balance peut varier. Le plancher ne remonte qu’après une journée finalisée plus haute et ne redescend jamais.',
    textEquivalent:
      'Départ, clôture de journée plus haute, remontée du plancher, journée suivante plus basse sans baisse du plancher, puis franchissement qui termine le compte.',
  },
  'HLP-VIS-003': {
    title: 'Une limite quotidienne atteinte arrête la journée',
    summary:
      'Le compte reste consultable et les actions qui réduisent le risque peuvent rester disponibles.',
    textEquivalent:
      'Après l’atteinte de la perte quotidienne, les nouvelles positions sont suspendues jusqu’au prochain reset. Le compte ne se termine pas pour cette règle seule.',
  },
  'HLP-VIS-004': {
    title: 'Votre meilleure journée ne doit pas porter tout le résultat',
    summary:
      'La règle mesure la concentration des journées positives. Elle retarde une réussite, elle ne termine pas le compte.',
    textEquivalent:
      'Cinq barres représentent des journées positives. La plus haute est comparée au total positif. Si sa part dépasse la limite, le passage est retardé mais le compte continue.',
  },
  'HLP-VIS-005': {
    title: 'Un gain existe sans forcément compter pour le programme',
    summary:
      'La durée publiée sépare un gain de courte durée d’un gain potentiellement éligible. Les pertes comptent toujours.',
    textEquivalent:
      'Une ligne de temps va de l’entrée au seuil publié puis à la sortie. Un gain clôturé avant le seuil peut ne pas compter ; au seuil ou après, il peut compter sous réserve des autres règles.',
  },
  'HLP-VIS-006': {
    title: 'Objectif atteint ne veut pas dire validation immédiate',
    summary: 'Le compte reste soumis aux règles pendant la finalisation et la vérification.',
    textEquivalent:
      'L’objectif atteint est suivi du maintien des règles, de la fin de journée, de la vérification des conditions, de la validation puis de la création éventuelle d’un compte Performance distinct.',
  },
  'HLP-VIS-008': {
    title: 'Le parcours complet, sans étape automatique',
    summary:
      'WARIBA ONE, validation, Performance, cycles de payout puis WARIBA Review — toujours dans un environnement simulé.',
    textEquivalent:
      'Le parcours part du choix d’une évaluation, passe par WARIBA ONE, la validation, WARIBA Performance, le buffer, les journées comptées et les payouts, puis se termine en WARIBA Review.',
  },
  'HLP-VIS-009': {
    title: 'Ce que vous pouvez retirer — et ce qui reste dans le compte',
    summary:
      'Le nominal forme la base, le buffer permanent reste non retirable, et seul l’excédent devient candidat au payout.',
    textEquivalent:
      'Une pile verticale distingue le montant nominal, le buffer permanent non retirable et les profits réalisés au-dessus, potentiellement éligibles au payout.',
  },
  'HLP-VIS-010': {
    title: 'Chaque payout exige de nouvelles journées comptées',
    summary:
      'Une journée doit atteindre le seuil publié, être finalisée et ne peut servir qu’une fois.',
    textEquivalent:
      'Un calendrier distingue les journées comptées des autres. Le nombre et le seuil viennent des règles Performance publiées, et un nouveau payout exige une nouvelle série.',
  },
  'HLP-VIS-011': {
    title: 'Cinq conditions à lire séparément',
    summary:
      'La page publique explique les critères. Votre espace WARIBA affiche leur état réel pour votre compte.',
    textEquivalent:
      'La checklist couvre le buffer, les journées comptées, l’excédent, l’état autorisé du compte et les vérifications requises. Aucun état de compte n’est simulé sur cette page publique.',
  },
  'HLP-VIS-012': {
    title: 'Comment le profit devient un montant payé au trader',
    summary:
      'Chaque étage du calcul réduit ou répartit le montant candidat. Aucun montant n’est calculé dans ce visuel.',
    textEquivalent:
      'Le parcours du calcul va des profits réalisés au buffer, au montant candidat, au cap, à la répartition puis au montant trader confirmé après paiement.',
  },
  'HLP-VIS-013': {
    title: 'Le dernier payout ouvre WARIBA Review',
    summary:
      'Les premières demandes et la dernière utilisent les parts publiées. Aucun cycle automatique ne suit Review.',
    textEquivalent:
      'Une ligne montre chaque payout autorisé par les règles publiées, la part applicable, puis la transition vers WARIBA Review sans sixième cycle automatique.',
  },
  'HLP-VIS-014': {
    title: 'Approuvé ne veut pas dire payé',
    summary:
      'Chaque demande traverse des étapes distinctes, et le statut final reste consultable dans WARIBA.',
    textEquivalent:
      'La demande est reçue, vérifiée, décidée, traitée puis marquée payée ou échouée. Une approbation n’est pas une confirmation de paiement.',
  },
  'HLP-VIS-015': {
    title: 'Un refus indique quoi vérifier ensuite',
    summary: 'Le message public regroupe les causes réelles sans exposer les codes internes.',
    textEquivalent:
      'Les familles de refus couvrent le marché ou les prix, l’état du compte, le risque ou l’exposition, la quantité ou la marge et un ordre invalide, avec une action utile pour chaque cas.',
  },
  'HLP-VIS-016': {
    title: 'Demande et contestation suivent deux parcours distincts',
    summary:
      'Chacun utilise cinq statuts publics, écrits en français et sans promesse de réécriture de l’historique.',
    textEquivalent:
      'Deux timelines présentent séparément les cinq statuts d’une demande de support et les cinq statuts d’une contestation.',
  },
  'HLP-VIS-017': {
    title: 'L’état du compte détermine ce que vous pouvez faire',
    summary:
      'Un blocage temporaire, une réussite en vérification et un compte terminé n’ouvrent pas les mêmes actions.',
    textEquivalent:
      'Depuis un compte actif, une branche mène au blocage temporaire puis au retour éventuel, une autre à la réussite en vérification puis Performance, et une dernière au compte terminé avec preuve consultable.',
  },
  'HLP-VIS-018': {
    title: 'Objectif atteint et évaluation validée sont deux moments différents',
    summary: 'Entre les deux, WARIBA finalise la journée et vérifie toutes les conditions.',
    textEquivalent:
      'Le premier panneau montre un objectif atteint avec règles encore actives. Après finalisation et vérification, le second montre une évaluation validée et une transition possible.',
  },
  'HLP-VIS-019': {
    title: 'La version attachée à votre compte reste la référence',
    summary:
      'La page publique explique les règles actuelles ; votre espace affiche celles qui s’appliquent réellement à votre compte.',
    textEquivalent:
      'Deux panneaux distinguent les règles actuellement publiées et la version attachée à un compte lors de son activation.',
  },
};

const SCREENSHOTS: Record<HelpScreenshotVisualId, ProductScreenshotModel> = {
  'HLP-SCR-001': {
    id: 'HLP-SCR-001',
    title: 'Placer un ordre dans le vrai ticket WariX',
    summary:
      'Le même ticket regroupe le type, la quantité, les protections, l’impact et les actions Buy / Sell.',
    src: '/help/visuals/HLP-SCR-001-warix-order-ticket-desktop.webp',
    mobileSrc: '/help/visuals/HLP-SCR-001-warix-order-ticket-mobile.webp',
    alt: 'Capture réelle du ticket d’ordre WariX actuel sur ordinateur et dans sa feuille dédiée sur téléphone.',
    callouts: [
      { id: 1, label: 'Type d’ordre', x: 73, y: 15 },
      { id: 2, label: 'Quantité', x: 73, y: 21 },
      { id: 3, label: 'Stop Loss / Take Profit', x: 73, y: 37 },
      { id: 4, label: 'Impact avant envoi', x: 75, y: 48 },
      { id: 5, label: 'Acheter / Vendre', x: 50, y: 93 },
    ],
  },
  'HLP-SCR-002': {
    id: 'HLP-SCR-002',
    title: 'Lire et modifier Stop Loss / Take Profit',
    summary: 'Les niveaux apparaissent sur le graphique avec la position et leurs actions réelles.',
    src: '/help/visuals/HLP-SCR-002-warix-sl-tp-desktop.webp',
    mobileSrc: '/help/visuals/HLP-SCR-002-warix-sl-tp-mobile.webp',
    alt: 'Capture réelle d’une position WariX avec son prix d’entrée, son Stop Loss et son Take Profit visibles sur le graphique.',
    callouts: [
      { id: 1, label: 'Prix d’entrée', x: 34, y: 91 },
      { id: 2, label: 'Take Profit', x: 34, y: 98 },
      { id: 3, label: 'Stop Loss', x: 34, y: 95 },
      { id: 4, label: 'Poignée du niveau', x: 41, y: 91 },
      { id: 5, label: 'Modification confirmée après validation', x: 52, y: 91 },
    ],
  },
  'HLP-SCR-003': {
    id: 'HLP-SCR-003',
    title: 'Fermer une partie d’une position',
    summary:
      'La position, la quantité à fermer et la quantité restante restent visibles dans le flux réel.',
    src: '/help/visuals/HLP-SCR-003-warix-partial-close-desktop.webp',
    mobileSrc: '/help/visuals/HLP-SCR-003-warix-partial-close-mobile.webp',
    alt: 'Capture réelle du formulaire WariX de clôture partielle d’une position de fixture.',
    callouts: [
      { id: 1, label: 'Position concernée', x: 18, y: 14 },
      { id: 2, label: 'Quantité actuelle', x: 28, y: 14 },
      { id: 3, label: 'Quantité à fermer', x: 17, y: 41 },
      { id: 4, label: 'Position restante', x: 17, y: 45 },
    ],
  },
  'HLP-SCR-004': {
    id: 'HLP-SCR-004',
    title: 'Lire les limites de risque dans WariX',
    summary:
      'Le contrôle risque actuel détaille les valeurs serveur, les deux limites et le prochain reset.',
    src: '/help/visuals/HLP-SCR-004-warix-risk-desktop.webp',
    mobileSrc: '/help/visuals/HLP-SCR-004-warix-risk-mobile.webp',
    alt: 'Capture réelle du détail de risque WariX avec progression, perte quotidienne, perte maximale et information de reset.',
    callouts: [
      { id: 1, label: 'Progression du programme', x: 18, y: 17 },
      { id: 2, label: 'Perte quotidienne restante', x: 18, y: 57 },
      { id: 3, label: 'Perte maximale restante', x: 18, y: 82 },
      { id: 4, label: 'Prochain reset et valeurs calculées par WARIBA', x: 72, y: 96 },
    ],
  },
  'HLP-SCR-005': {
    id: 'HLP-SCR-005',
    title: 'Comprendre la preuve d’un compte terminé',
    summary:
      'La preuve publique montre la règle, le seuil, la valeur observée, la date et la version des règles.',
    src: '/help/visuals/HLP-SCR-005-breach-evidence-desktop.webp',
    mobileSrc: '/help/visuals/HLP-SCR-005-breach-evidence-mobile.webp',
    alt: 'Capture réelle de la preuve trader d’une perte maximale franchie, sans identifiant technique interne.',
    callouts: [
      { id: 1, label: 'Règle concernée', x: 16, y: 16 },
      { id: 2, label: 'Conséquence', x: 20, y: 33 },
      { id: 3, label: 'Seuil', x: 60, y: 62 },
      { id: 4, label: 'Valeur observée', x: 60, y: 72 },
      { id: 5, label: 'Date et heure', x: 60, y: 82 },
      { id: 6, label: 'Version des règles', x: 60, y: 91 },
      { id: 7, label: 'Comprendre la règle', x: 14, y: 43 },
    ],
  },
  'HLP-SCR-006': {
    id: 'HLP-SCR-006',
    title: 'Ouvrir une contestation depuis la preuve',
    summary:
      'Le point d’entrée réel rattache la décision au dossier : aucun chiffre n’est à recopier.',
    src: '/help/visuals/HLP-SCR-006-dispute-entry-desktop.webp',
    mobileSrc: '/help/visuals/HLP-SCR-006-dispute-entry-mobile.webp',
    alt: 'Capture réelle du parcours trader depuis un compte terminé vers l’ouverture d’une contestation.',
    callouts: [
      { id: 1, label: 'Décision concernée', x: 50, y: 12 },
      { id: 2, label: 'Motif de la contestation', x: 50, y: 35 },
      { id: 3, label: 'Expliquer le désaccord', x: 50, y: 63 },
      { id: 4, label: 'Ouvrir la contestation', x: 84, y: 94 },
      { id: 5, label: 'Référence CTS après envoi', x: 67, y: 94 },
    ],
  },
  'HLP-SCR-007': {
    id: 'HLP-SCR-007',
    title: 'Suivre une demande de support',
    summary:
      'La référence, le statut, la conversation et la réponse restent regroupés sur une seule page.',
    src: '/help/visuals/HLP-SCR-007-support-ticket-desktop.webp',
    mobileSrc: '/help/visuals/HLP-SCR-007-support-ticket-mobile.webp',
    alt: 'Capture réelle d’une demande de support WARIBA avec sa référence publique, son statut, sa conversation et le formulaire de réponse.',
    callouts: [
      { id: 1, label: 'Référence WRB', x: 8, y: 5 },
      { id: 2, label: 'Statut', x: 20, y: 5 },
      { id: 3, label: 'Dernière activité', x: 62, y: 21 },
      { id: 4, label: 'Conversation', x: 50, y: 50 },
      { id: 5, label: 'Répondre', x: 50, y: 80 },
    ],
  },
};

function dynamicFacts(policyFacts: HelpPolicyFacts): HelpVisualFacts {
  const value = (key: keyof HelpVisualFacts) =>
    policyFacts.facts[key]?.value ?? HELP_FACT_UNPUBLISHED;
  return {
    profitTargetRate: value('profitTargetRate'),
    dailyLossRate: value('dailyLossRate'),
    maximumLossRate: value('maximumLossRate'),
    bestDayMaxRatio: value('bestDayMaxRatio'),
    minimumTradingDays: value('minimumTradingDays'),
    shortDurationSeconds: value('shortDurationSeconds'),
    permanentBufferRate: value('permanentBufferRate'),
    performanceDayThresholdRate: value('performanceDayThresholdRate'),
    performanceDaysRequired: value('performanceDaysRequired'),
    traderSplitDefault: value('traderSplitDefault'),
    traderSplitFinalCycle: value('traderSplitFinalCycle'),
    maxPayoutCyclesBeforeReview: value('maxPayoutCyclesBeforeReview'),
    evaluationPolicyVersion: value('evaluationPolicyVersion'),
    performancePolicyVersion: value('performancePolicyVersion'),
  };
}

function isDynamic(id: HelpP0VisualId): id is HelpDynamicVisualId {
  return (HELP_DYNAMIC_VISUAL_IDS as readonly string[]).includes(id);
}

export function HelpArticleVisual({
  id,
  policyFacts,
}: {
  id: HelpP0VisualId;
  policyFacts: HelpPolicyFacts;
}) {
  if (!isDynamic(id)) return <AnnotatedProductScreenshot model={SCREENSHOTS[id]} />;

  const model: HelpVisualModel = {
    id,
    ...DYNAMIC_COPY[id],
    facts: dynamicFacts(policyFacts),
    performanceDaysRequired: policyFacts.visual.performanceDaysRequired,
    maxPayoutCyclesBeforeReview: policyFacts.visual.maxPayoutCyclesBeforeReview,
  };
  return <HelpVisual model={model} />;
}
