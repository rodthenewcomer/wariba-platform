import type {
  AccountLifecycleView,
  PayoutLifecycleView,
  PerformanceKpis,
} from '@wariba/application';
import type { QuickAction } from './QuickActions';

/**
 * Which shortcuts a trader is offered, and when.
 *
 * ## The rule
 *
 * An action appears when it can be taken. Nothing is rendered disabled, and
 * nothing is rendered "for later". A greyed "Demander un payout" on an account
 * weeks away from eligibility is not information — it is a control that has
 * taught the trader to stop reading controls.
 *
 * Extracted from the page because "which action is live right now" is a
 * decision about product state, and burying it in JSX is how the same
 * condition ends up written three slightly different ways.
 */
export function quickActionsFor(params: {
  lifecycle: AccountLifecycleView;
  accountId: string;
  payout?: PayoutLifecycleView | null;
  kpis?: PerformanceKpis | null;
}): QuickAction[] {
  const actions: QuickAction[] = [];
  const { lifecycle, payout, kpis } = params;

  /*
   * "Ouvrir WariX" is deliberately absent.
   *
   * The hero carries it as the page's one primary action and the sticky header
   * repeats it at secondary weight for when the hero has scrolled away. A
   * third copy in a shortcut grid would be a shortcut to something already on
   * screen twice — and three identical calls to action is a hierarchy that has
   * stopped choosing.
   */

  // Identity verification outranks everything else the moment it is the only
  // thing between a trader and money they have already earned.
  if (payout?.state === 'eligible_kyc_required') {
    actions.push({
      label: 'Vérifier mon identité',
      href: '/verification-identite',
      icon: 'identity',
      hint: 'Dernière étape avant votre payout',
      emphasis: true,
    });
  }

  if (payout?.state === 'request_ready') {
    actions.push({
      label: 'Demander un payout',
      href: '/payouts',
      icon: 'payouts',
      hint: 'Vous remplissez les conditions',
      emphasis: true,
    });
  }

  // Only offered once there is something to look at. A performance page with
  // no trades in it is a wasted tap.
  if (kpis && kpis.tradeCount > 0) {
    actions.push({
      label: 'Voir ma performance',
      href: '/performance',
      icon: 'performance',
      hint: `${kpis.tradeCount} trade${kpis.tradeCount > 1 ? 's' : ''} enregistré${kpis.tradeCount > 1 ? 's' : ''}`,
    });
    actions.push({
      label: 'Ouvrir mon journal',
      href: '/journal',
      icon: 'journal',
      hint: 'Analyser vos trades un par un',
    });
  }

  actions.push({
    label: 'Voir les règles',
    href: '/programme#regles',
    icon: 'shield',
    hint: 'Objectif, pertes, consistance',
  });

  if (lifecycle.terminal || lifecycle.state === 'breached') {
    actions.push({
      label: 'Acheter un nouveau compte',
      href: '/comptes/nouveau',
      icon: 'addAccount',
      hint: 'Repartir sur une nouvelle évaluation',
      emphasis: true,
    });
  }

  // Four is the ceiling. A grid of shortcuts long enough to scroll is a second
  // navigation, and the product already has one.
  return actions.slice(0, 4);
}
