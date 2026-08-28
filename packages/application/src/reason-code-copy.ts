import {
  CANONICAL_REASON_CODES,
  resolveCanonicalReasonCode,
  type CanonicalReasonCode,
} from '@wariba/policies';

/**
 * Phase 3.4.4 §15/§55/§68 — the one place a canonical reason code becomes
 * words.
 *
 * ## Why the code travels and the sentence does not
 *
 * Before this file, a refused order reached the trader as whatever string the
 * layer nearest the failure happened to hold. WariX matched on message text to
 * decide which panel to show; Support improvised a financial explanation from
 * the same string. Both are the same bug wearing different clothes: the
 * meaning of a refusal was being recovered from its rendering.
 *
 * The server emits `CanonicalReasonCode` (packages/policies/src/reason-codes.ts).
 * This module is the only translation of it. A surface that needs to branch
 * branches on the code; a surface that needs to speak reads `traderCopy`.
 *
 * ## Why a refusal is not a breach
 *
 * §16 is a product rule with teeth: margin, exposure, news and market-closure
 * refusals are the platform declining one order, not a verdict on the account.
 * `severity` carries that distinction structurally, so no caller has to
 * remember it — `'refusal'` may never be rendered with breach chrome, and only
 * `'terminal'` describes an account that is actually over.
 *
 * `title` is deliberately short enough to head a bottom sheet on a 320 px
 * screen; `body` explains, and `remedy` says what the trader can do about it
 * right now. A refusal with no remedy is a dead end, so every `'refusal'`
 * carries one.
 */
export type ReasonSeverity =
  /** One command declined. The account is healthy and stays open. */
  | 'refusal'
  /** Trading is paused by a rule that lifts on its own (reset, window end). */
  | 'pause'
  /** A condition the trader has not met yet — progress, not fault. */
  | 'pending'
  /** The account is over. Only this severity may be rendered as a breach. */
  | 'terminal';

export interface ReasonCodeCopy {
  code: CanonicalReasonCode;
  severity: ReasonSeverity;
  /** Short heading. Never contains "violation", "faute" or "perdu" below `terminal`. */
  title: string;
  /** What happened, in the trader's language. */
  body: string;
  /** What the trader can do now. Null only where nothing is actionable. */
  remedy: string | null;
  /**
   * The same fact for an operator or a support agent.
   *
   * Support must not improvise a financial explanation (§55), and the trader's
   * sentence is written for reassurance rather than precision — so the precise
   * one is stored beside it rather than left to be reconstructed.
   */
  supportCopy: string;
}

const COPY: Readonly<Record<CanonicalReasonCode, Omit<ReasonCodeCopy, 'code'>>> = {
  // ---------------------------------------------------------------- risque
  DAILY_LOSS_SOFT_LOCKED: {
    severity: 'pause',
    title: 'Trading en pause',
    body: 'Votre limite quotidienne a été atteinte. Votre compte reste ouvert.',
    remedy: 'Vous pourrez reprendre après le prochain reset.',
    supportCopy:
      'Limite de perte quotidienne atteinte : soft lock jusqu’au prochain reset. Le compte n’est ni en faute ni terminé.',
  },
  DAILY_RESET_COMPLETED: {
    severity: 'pending',
    title: 'Nouvelle journée',
    body: 'Votre limite quotidienne est réinitialisée.',
    remedy: null,
    supportCopy: 'Reset quotidien effectué : nouvelle référence journalière appliquée.',
  },
  MAXIMUM_LOSS_BREACHED: {
    severity: 'terminal',
    title: 'Compte terminé',
    body: 'La perte maximale de ce compte a été atteinte.',
    remedy: null,
    supportCopy:
      'Perte maximale franchie : compte terminé. Le plancher et la décision sont reconstructibles depuis les snapshots quotidiens.',
  },
  ACCOUNT_SOFT_LOCKED: {
    severity: 'pause',
    title: 'Trading en pause',
    body: 'Les nouvelles positions sont temporairement indisponibles sur ce compte.',
    remedy: 'Vous pouvez toujours réduire ou clôturer vos positions ouvertes.',
    supportCopy: 'Compte en soft lock : ouverture refusée, réduction et clôture autorisées.',
  },
  ACCOUNT_BREACHED: {
    severity: 'terminal',
    title: 'Compte terminé',
    body: 'Ce compte a atteint une limite qui met fin au programme.',
    remedy: null,
    supportCopy:
      'Compte en état terminal. Aucune nouvelle exposition possible; historique conservé.',
  },
  BEST_DAY_NOT_YET_COMPLIANT: {
    severity: 'pending',
    title: 'Meilleure journée à ramener sous la limite',
    body: 'Vos gains sont pour l’instant trop concentrés sur une seule journée.',
    remedy: 'Continuez à trader pour ramener ce ratio sous la limite. Votre compte reste ouvert.',
    supportCopy:
      'Règle de la meilleure journée non conforme : bloque la demande de paiement, ne termine jamais le compte (best_day_breach_capable = false).',
  },
  PROFIT_SHORT_DURATION_INELIGIBLE: {
    severity: 'pending',
    title: 'Gain non compté dans votre progression',
    body: 'Ce trade gagnant a été clôturé avant 60 secondes. Son gain reste dans votre P&L mais ne compte pas dans votre progression WARIBA.',
    remedy: null,
    supportCopy:
      'Profit exclu de l’assiette éligible : durée de détention inférieure à minimum_profit_eligible_duration_ms. Le P&L du compte est inchangé.',
  },
  TARGET_NOT_REACHED: {
    severity: 'pending',
    title: 'Objectif non atteint',
    body: 'L’objectif de profit de ce compte n’est pas encore atteint.',
    remedy: null,
    supportCopy: 'Objectif de profit non réalisé sur la base éligible.',
  },

  // ------------------------------------------------------ marge/exposition
  MARGIN_CAP_NOT_CALIBRATED: {
    severity: 'refusal',
    title: 'Ordre refusé',
    body: 'Les limites de marge de ce compte ne sont pas disponibles actuellement.',
    remedy: 'Réessayez plus tard. Vous pouvez toujours réduire ou clôturer vos positions.',
    supportCopy:
      'Cap de marge non calibré pour la policy attachée : le contrôle échoue fermé, aucune exposition nouvelle n’est autorisée.',
  },
  MARGIN_CAP_EXCEEDED: {
    severity: 'refusal',
    title: 'Ordre refusé',
    body: 'Cet ordre dépasserait la marge maximale autorisée pour votre compte.',
    remedy: 'Réduisez la taille pour continuer.',
    supportCopy:
      'Marge requise au-delà du cap de la policy attachée. Refus pré-trade, aucun impact sur l’état du compte.',
  },
  GROSS_EXPOSURE_EXCEEDED: {
    severity: 'refusal',
    title: 'Ordre refusé',
    body: 'Cet ordre dépasserait votre exposition maximale.',
    remedy: 'Réduisez la taille ou fermez une position existante.',
    supportCopy:
      'Exposition notionnelle brute au-delà du plafond. Les positions opposées ne se compensent jamais : chaque jambe compte en valeur absolue.',
  },
  EXPOSURE_CONVERSION_UNAVAILABLE: {
    severity: 'refusal',
    title: 'Ordre refusé',
    body: 'Votre exposition ne peut pas être calculée avec certitude en ce moment.',
    remedy: 'Réessayez plus tard. Vous pouvez toujours réduire ou clôturer vos positions.',
    supportCopy:
      'Prix ou conversion autoritaire manquant : le contrôle d’exposition échoue fermé plutôt que d’estimer un notionnel.',
  },
  NEWS_EXPOSURE_INCREASE_BLOCKED: {
    severity: 'pause',
    title: 'Annonce économique',
    body: 'Vous pouvez réduire ou fermer vos positions. Les nouvelles positions et augmentations sont temporairement indisponibles.',
    remedy: 'La restriction se lève à la fin de la fenêtre.',
    supportCopy:
      'Fenêtre news à impact élevé active sur le groupe d’actifs : reduce/close uniquement. Ce n’est pas une infraction.',
  },
  MARKET_CLOSURE_EXPOSURE_INCREASE_BLOCKED: {
    severity: 'pause',
    title: 'Fermeture du marché proche',
    body: 'Vous pouvez réduire ou fermer. Les nouvelles positions sont temporairement indisponibles.',
    remedy: 'La restriction se lève à la réouverture.',
    supportCopy:
      'Fenêtre de fermeture de session active : reduce/close uniquement. Ce n’est pas une infraction.',
  },
  NEWS_CALENDAR_SOURCE_UNAVAILABLE: {
    severity: 'refusal',
    title: 'Ordre refusé',
    body: 'Le calendrier économique requis par ce compte n’est pas disponible actuellement.',
    remedy: 'Réessayez plus tard. Vous pouvez toujours réduire ou clôturer vos positions.',
    supportCopy:
      'La policy exige un calendrier news; aucune source prête n’est rattachée. Échec fermé volontaire — aucun événement n’est simulé.',
  },
  MARKET_SESSION_SOURCE_UNAVAILABLE: {
    severity: 'refusal',
    title: 'Ordre refusé',
    body: 'Le calendrier des sessions requis par ce compte n’est pas disponible actuellement.',
    remedy: 'Réessayez plus tard. Vous pouvez toujours réduire ou clôturer vos positions.',
    supportCopy:
      'La policy exige un calendrier de sessions; aucune source prête n’est rattachée. Échec fermé volontaire.',
  },

  // ---------------------------------------------------------------- payout
  PAYOUT_BUFFER_NOT_REACHED: {
    severity: 'pending',
    title: 'Réserve de sécurité incomplète',
    body: 'Votre réserve de sécurité n’est pas encore constituée.',
    remedy: 'Elle se construit avec vos gains éligibles.',
    supportCopy: 'Plancher de buffer permanent non atteint : aucun excédent demandable.',
  },
  PERFORMANCE_DAYS_INSUFFICIENT: {
    severity: 'pending',
    title: 'Journées Performance incomplètes',
    body: 'Il vous reste des journées Performance à valider sur ce cycle.',
    remedy: 'Une journée compte lorsqu’elle atteint le seuil publié pour votre compte.',
    supportCopy: 'Journées Performance du cycle courant insuffisantes pour ouvrir une demande.',
  },
  PAYOUT_CAP_APPLIED: {
    severity: 'pending',
    title: 'Plafond du cycle appliqué',
    body: 'Le montant demandé dépasse le paiement maximum de ce cycle.',
    remedy: 'Le montant retenu est ramené au plafond du cycle.',
    supportCopy: 'Cap de payout du rang de cycle appliqué au net trader.',
  },
  PAYOUT_REVIEW_AFTER_FIFTH: {
    severity: 'pending',
    title: 'WARIBA Review',
    body: 'Vous avez terminé vos cinq premiers cycles Performance. Votre historique est maintenant en cours de revue pour la suite.',
    remedy: null,
    supportCopy:
      'Compte entré en WARIBA Review après le cycle final. Aucun nouveau cycle n’est ouvert; la suite reste une décision ouverte.',
  },
  PAYOUT_DEBIT_RISK_NEUTRAL: {
    severity: 'pending',
    title: 'Paiement sans effet sur vos limites',
    body: 'Un paiement autorisé ne peut pas déclencher une limite de risque sur votre compte.',
    remedy: null,
    supportCopy:
      'PAYOUT_DEBIT_CANNOT_CAUSE_TRADING_BREACH : le débit est financier et neutre pour daily loss, maximum loss et terminaison.',
  },
  KYC_REQUIRED: {
    severity: 'pending',
    title: 'Identité à vérifier',
    body: 'Vos conditions de trading sont remplies. Vérifiez maintenant votre identité pour demander votre paiement.',
    remedy: 'Vérifier mon identité',
    supportCopy: 'Éligibilité financière atteinte, vérification d’identité manquante.',
  },
  KYC_NOT_VERIFIED: {
    severity: 'pending',
    title: 'Vérification d’identité en attente',
    body: 'Votre vérification d’identité n’est pas encore confirmée.',
    remedy: 'Vérifier mon identité',
    supportCopy: 'Vérification d’identité non confirmée sur le compte.',
  },
  PAYOUT_RAIL_UNAVAILABLE_FOR_COUNTRY: {
    severity: 'pending',
    title: 'Moyen de paiement à configurer',
    body: 'Aucun moyen de paiement utilisable n’est enregistré pour ce compte.',
    remedy: 'Ajouter un moyen de paiement',
    supportCopy:
      'Aucun rail de paiement disponible/configuré. Ne jamais annoncer un rail mobile money tant que la capability n’est pas réellement activée.',
  },

  // ------------------------------------------------------------- lifecycle
  FLEX_ACTIVATION_REQUIRED: {
    severity: 'pending',
    title: 'Activez votre compte Performance',
    body: 'Votre évaluation est réussie. Il reste une dernière étape avant de trader votre compte Performance.',
    remedy: 'Activer mon compte Performance',
    supportCopy:
      'Obligation d’activation FLEX due. Le montant affiché est le snapshot pris à l’achat, jamais le prix catalogue courant.',
  },
  FLEX_ACTIVATION_EXPIRED: {
    severity: 'terminal',
    title: 'Délai d’activation dépassé',
    body: 'La période d’activation de ce compte Performance est terminée.',
    remedy: null,
    supportCopy:
      'Obligation d’activation FLEX expirée à son due_at. Aucun compte Performance n’a été provisionné.',
  },
  PAID_ACQUISITION_CELL_GATED: {
    severity: 'pending',
    title: 'Offre non disponible',
    body: 'Cette offre n’est pas ouverte à l’achat actuellement.',
    remedy: null,
    supportCopy:
      'Gate d’acquisition payante fermé sur la cellule. La taille reste publique au catalogue : disponibilité catalogue ≠ gate payant.',
  },
  ACTIVATION_QUOTA_REACHED: {
    severity: 'pending',
    title: 'Offre non disponible',
    body: 'Cette offre n’est pas ouverte à l’activation actuellement.',
    remedy: null,
    supportCopy: 'Quota d’activation atteint pour la cellule.',
  },
  RESERVE_GATE_CLOSED: {
    severity: 'pending',
    title: 'Offre non disponible',
    body: 'Cette offre n’est pas ouverte à l’activation actuellement.',
    remedy: null,
    supportCopy: 'Gate de réserve fermé pour la cellule.',
  },
};

/**
 * The message a surface shows when it holds a code nobody has written words
 * for.
 *
 * Generic on purpose, and never a breach: an unrecognised code is a
 * propagation gap, and guessing that it means "your account is over" is the
 * one failure mode worth designing against. The correlation id is what turns
 * this into something support can act on.
 */
export const UNKNOWN_REASON_COPY: Omit<ReasonCodeCopy, 'code'> = {
  severity: 'refusal',
  title: 'Action impossible',
  body: 'Cette action n’a pas pu aboutir.',
  remedy: 'Réessayez. Si cela se reproduit, contactez le support avec la référence affichée.',
  supportCopy: 'Code de raison non reconnu par la table de traduction — à propager.',
};

export function reasonCodeCopy(code: CanonicalReasonCode): ReasonCodeCopy {
  return { code, ...COPY[code] };
}

/**
 * Resolves any persisted or runtime code — including the legacy vocabularies
 * still written into evidence rows — to its words.
 *
 * Returns null rather than inventing copy for an unknown code, so a caller
 * chooses between `UNKNOWN_REASON_COPY` and its own fallback instead of being
 * handed a confident sentence about a condition nobody mapped.
 */
export function resolveReasonCodeCopy(code: string): ReasonCodeCopy | null {
  const canonical = resolveCanonicalReasonCode(code);
  return canonical ? reasonCodeCopy(canonical) : null;
}

/** Every canonical code, for the Support reference table and for coverage tests. */
export const ALL_REASON_CODE_COPY: readonly ReasonCodeCopy[] =
  Object.values(CANONICAL_REASON_CODES).map(reasonCodeCopy);
