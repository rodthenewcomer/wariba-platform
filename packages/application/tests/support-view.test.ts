import { describe, expect, it } from 'vitest';
import { CONTROL_PERMISSIONS, staffCan, type ControlPermission } from '@wariba/database';
import {
  CONTESTATION_DECISION_LABELS,
  CONTESTATION_REASON_CATEGORIES,
  CONTESTATION_REASON_LABELS,
  CONTESTATION_STATUS_LABELS,
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_CATEGORY_SHORT,
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUS_NEXT_ACTION,
  SUPPORT_STATUS_TONE,
  formatAge,
  projectContestationEvidence,
  projectContestationView,
} from '../src/support-view';
import {
  parseControlContestationQuery,
  parseControlSupportQuery,
  controlSupportPageHref,
} from '../src/control-support-view';

describe('support vocabulary', () => {
  it('gives every category and status a French label in both forms', () => {
    for (const category of SUPPORT_CATEGORIES) {
      expect(SUPPORT_CATEGORY_LABELS[category]).toBeTruthy();
      expect(SUPPORT_CATEGORY_SHORT[category]).toBeTruthy();
    }
    for (const status of Object.keys(
      SUPPORT_STATUS_LABELS,
    ) as (keyof typeof SUPPORT_STATUS_LABELS)[]) {
      expect(SUPPORT_STATUS_LABELS[status]).toBeTruthy();
      // A status word says where a request stands; the next action says whose
      // turn it is. A status with a label and no next action is exactly the
      // case a trader reads as "wait" when WARIBA is waiting on them.
      expect(SUPPORT_STATUS_NEXT_ACTION[status]).toBeTruthy();
    }
    for (const reason of CONTESTATION_REASON_CATEGORIES) {
      expect(CONTESTATION_REASON_LABELS[reason]).toBeTruthy();
    }
  });

  it('reserves the attention tone for the one status the trader must act on', () => {
    const attention = Object.entries(SUPPORT_STATUS_TONE)
      .filter(([, tone]) => tone === 'attention')
      .map(([status]) => status);
    // A queue that paints every open request amber teaches people to ignore
    // amber. Only `waiting_for_user` — where the trader is the blocker — earns it.
    expect(attention).toEqual(['waiting_for_user']);
  });

  it('never softens an escalation into something that sounds like a win', () => {
    expect(CONTESTATION_DECISION_LABELS.upheld).toBe('Décision maintenue');
    expect(CONTESTATION_DECISION_LABELS.requires_escalation).toBe('Dossier escaladé');
    expect(CONTESTATION_STATUS_LABELS.upheld).toBe('Décision maintenue');
  });
});

describe('formatAge', () => {
  const base = new Date('2026-08-23T12:00:00.000Z');

  it('reads the way a queue is read', () => {
    expect(formatAge(base, base)).toBe('à l’instant');
    expect(formatAge(new Date('2026-08-23T11:42:00.000Z'), base)).toBe('il y a 18 min');
    expect(formatAge(new Date('2026-08-23T09:00:00.000Z'), base)).toBe('il y a 3 h');
    expect(formatAge(new Date('2026-08-22T12:00:00.000Z'), base)).toBe('il y a 1 jour');
    expect(formatAge(new Date('2026-08-20T12:00:00.000Z'), base)).toBe('il y a 3 jours');
  });

  it('never produces a negative age from a clock that is slightly ahead', () => {
    expect(formatAge(new Date('2026-08-23T12:00:30.000Z'), base)).toBe('à l’instant');
  });
});

const EVIDENCE = {
  targetType: 'account_breach' as const,
  targetId: 'violation-1',
  account: {
    accountId: 'account-1',
    accountPublicId: 'EVAL-10000-ABCD1234',
    programType: 'WARIBA_ONE',
    status: 'breached',
  },
  violation: {
    ruleCode: 'RISK_MAXIMUM_LOSS_BREACH' as const,
    severity: 'critical',
    consequence: 'hard_breach',
    thresholdValue: '9000.0000',
    observedValue: '8998.5000',
    triggerEventType: 'trade_order',
    triggerEventId: 'order-1',
    priceSnapshot: {},
    calculationVersion: 'v1',
    occurredAt: new Date('2026-08-23T10:15:00.000Z'),
  },
  policy: {
    policyVersionId: 'policy-1',
    program: 'WARIBA_ONE',
    semanticVersion: '1.1.0',
    status: 'published',
    machineHash: 'abc',
  },
  transition: {
    fromStatus: 'active',
    toStatus: 'breached',
    reason: 'maximum_loss_breach',
    occurredAt: new Date('2026-08-23T10:15:00.000Z'),
  },
  snapshot: {
    tradingDay: '2026-08-23',
    dailyReference: '10000.0000',
    maximumLossFloorBefore: '9000.0000',
    maximumLossFloorAfter: '9000.0000',
    sodBalance: '10000.0000',
    eodBalance: null,
    status: 'open',
  },
  order: {
    orderId: 'order-1',
    orderType: 'market_open',
    symbol: 'XAUUSD',
    side: 'buy',
    status: 'filled',
    requestedQuantity: '1.00',
    filledQuantity: '1.00',
    rejectionCode: null,
    receivedAt: new Date('2026-08-23T10:14:00.000Z'),
    completedAt: new Date('2026-08-23T10:14:01.000Z'),
    fills: [
      {
        fillId: 'fill-1',
        fillType: 'close',
        quantity: '1.00',
        price: '2410.55',
        spreadPoints: '2',
        slippagePoints: '0',
        realizedPnl: '-1001.5000',
        marketSequence: '42',
        occurredAt: new Date('2026-08-23T10:14:01.000Z'),
      },
    ],
  },
};

describe('projectContestationEvidence', () => {
  it('renders the rule, the threshold and the observed value as the engine recorded them', () => {
    const view = projectContestationEvidence(EVIDENCE);

    expect(view.ruleLabel).toBe('Perte maximale');
    expect(view.consequenceLabel).toBe('Compte terminé');

    const byLabel = new Map(view.rows.map((row) => [row.label, row.value]));
    // fr-FR groups with a narrow no-break space (U+202F), which is correct
    // French typography and not what a keyboard produces — spelled out here so
    // the assertion cannot pass by accident against an ordinary space.
    expect(byLabel.get('Seuil')).toBe('9\u202f000,00 USD');
    expect(byLabel.get('Valeur observée')).toBe('8\u202f998,50 USD');
    expect(byLabel.get('Version des règles')).toBe('WARIBA ONE 1.1.0');
    // French on both sides of the arrow. `active → breached` is the schema
    // talking to a person, which is what account-status-labels.ts exists to
    // stop; the same applies to the trigger.
    expect(byLabel.get('Transition du compte')).toBe('Actif → Limite maximale dépassée');
    // Dit au trader ce qui s'est passé, pas le nom de la valeur en base.
    expect(byLabel.get('Événement déclencheur')).toBe('Un ordre que vous avez passé');
    expect(byLabel.get('Journée')).toBe('2026-08-23');
  });

  it('marks every figure as tabular so a dispute reads as a record', () => {
    const view = projectContestationEvidence(EVIDENCE);
    for (const label of ['Seuil', 'Valeur observée', 'Constaté le', 'Compte']) {
      expect(view.rows.find((row) => row.label === label)?.numeric).toBe(true);
    }
  });

  it('carries the triggering order and its fills', () => {
    const view = projectContestationEvidence(EVIDENCE);
    expect(view.orderRows.find((row) => row.label === 'Instrument')?.value).toBe('XAUUSD');
    expect(view.fills).toHaveLength(1);
    expect(view.fills[0]?.typeLabel).toBe('Clôture');
    expect(view.fills[0]?.realizedPnl).toBe('-1\u202f001,50 USD');
  });

  it('renders a decision produced by a daily finalization without an order', () => {
    const view = projectContestationEvidence({
      ...EVIDENCE,
      violation: { ...EVIDENCE.violation, triggerEventType: 'daily_finalization' },
      order: null,
    });
    expect(view.orderRows).toHaveLength(0);
    expect(view.fills).toHaveLength(0);
  });
});

describe('projectContestationView', () => {
  const base = {
    publicId: 'CTS-01001',
    ticketPublicId: 'WRB-01042',
    accountPublicId: 'EVAL-10000-ABCD1234',
    targetType: 'account_breach' as const,
    targetId: 'violation-1',
    reasonCategory: 'rule_misapplied' as const,
    traderStatement: 'Je conteste.',
    openedAt: new Date('2026-08-23T10:20:00.000Z'),
    reviewedAt: null,
    resolvedAt: null,
    correlationId: 'corr-1',
    evidence: EVIDENCE,
  };

  it('shows no outcome while the contestation is still live', () => {
    const view = projectContestationView({
      ...base,
      status: 'under_review',
      decision: null,
      decisionReason: null,
    });
    expect(view.decisionLabel).toBeNull();
    expect(view.statusLabel).toBe('En cours d’examen');
    expect(view.evidence).not.toBeNull();
  });

  it('names an escalation as an escalation', () => {
    const view = projectContestationView({
      ...base,
      status: 'closed',
      decision: 'requires_escalation',
      decisionReason: 'Dossier transmis au comité de risque.',
      resolvedAt: new Date('2026-08-23T14:00:00.000Z'),
    });
    expect(view.decisionLabel).toBe('Dossier escaladé');
    expect(view.resolvedAtLabel).toBeTruthy();
  });
});

describe('Control queue query parsing', () => {
  it('applies known filters and reports unusable ones instead of dropping them silently', () => {
    const query = parseControlSupportQuery({
      status: 'under_review',
      category: 'breach',
      assignment: 'unassigned',
      age: '24h',
      q: 'WRB-01042',
    });
    expect(query.filters.status).toBe('under_review');
    expect(query.filters.category).toBe('breach');
    expect(query.filters.assignment).toBe('unassigned');
    expect(query.filters.minAgeHours).toBe(24);
    expect(query.filters.query).toBe('WRB-01042');
    expect(query.ignored).toHaveLength(0);
  });

  it('rejects a value that is not in the closed set, and names it', () => {
    const query = parseControlSupportQuery({ status: 'escalated', age: 'forever' });
    expect(query.filters.status).toBeUndefined();
    expect(query.filters.minAgeHours).toBeUndefined();
    // A filter that silently does nothing is how an operator concludes the
    // queue is empty when it is not.
    expect([...query.ignored].sort()).toEqual(['age', 'status']);
  });

  it('parses the contestation queue on its own vocabulary', () => {
    const query = parseControlContestationQuery({
      status: 'needs_information',
      target: 'account_breach',
      reason: 'market_data_disputed',
    });
    expect(query.filters.status).toBe('needs_information');
    expect(query.filters.targetType).toBe('account_breach');
    expect(query.filters.reasonCategory).toBe('market_data_disputed');
    expect(query.ignored).toHaveLength(0);
  });

  it('keeps only the filters a queue actually owns when paging', () => {
    const params = { status: 'open', category: 'breach', target: 'account_breach', junk: 'x' };
    expect(controlSupportPageHref(params, 2)).toBe(
      '/control/support?status=open&category=breach&page=2',
    );
    expect(controlSupportPageHref(params, 2, '/control/contestations')).toBe(
      '/control/contestations?status=open&target=account_breach&page=2',
    );
  });
});

describe('support and dispute permissions', () => {
  const NEW_PERMISSIONS: readonly ControlPermission[] = [
    'support.read',
    'support.reply',
    'support.assign',
    'support.resolve',
    'dispute.read',
    'dispute.assign',
    'dispute.review',
    'dispute.resolve',
  ];

  it('declares every Phase 3.2 permission in the real permission table', () => {
    for (const permission of NEW_PERMISSIONS) {
      expect(CONTROL_PERMISSIONS).toContain(permission);
    }
  });

  it('gives the support role its own queue and nothing financial', () => {
    for (const permission of [
      'support.read',
      'support.reply',
      'support.assign',
      'support.resolve',
      'dispute.read',
    ] as const) {
      expect(staffCan('support', permission)).toBe(true);
    }

    /*
     * Constitution §132: « Support peut lire résumé, tickets et escalader. Ne
     * peut pas approuver payout ni modifier règle. »
     *
     * Asserted against the real permission table rather than against a list
     * maintained beside it, so adding support to any of these fails here.
     */
    for (const permission of [
      'payout.approve',
      'payout.reject',
      'payout.settle',
      'payout.reverse',
      'treasury.modify',
      'actuarial.modify',
      'commercial_product.modify',
      'integrity_hold.place',
      'integrity_hold.clear',
      'sandbox_kyc.modify',
      'audit_evidence.view',
      // Support raises a dispute; it does not decide one over its own tickets.
      'dispute.review',
      'dispute.resolve',
    ] as const) {
      expect(staffCan('support', permission), `support must not hold ${permission}`).toBe(false);
    }
  });

  it('gives risk and compliance the dispute authority, and not the ticket queue', () => {
    for (const role of ['risk', 'compliance'] as const) {
      expect(staffCan(role, 'dispute.read')).toBe(true);
      expect(staffCan(role, 'dispute.review')).toBe(true);
      expect(staffCan(role, 'dispute.resolve')).toBe(true);
      // Answering support tickets is a different job with a different queue.
      expect(staffCan(role, 'support.reply')).toBe(false);
      expect(staffCan(role, 'support.resolve')).toBe(false);
    }
  });

  it('gives finance no support or dispute authority at all', () => {
    for (const permission of NEW_PERMISSIONS) {
      expect(staffCan('finance', permission), `finance must not hold ${permission}`).toBe(false);
    }
  });
});
