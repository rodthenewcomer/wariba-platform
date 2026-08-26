import {
  loadControlOverview,
  staffCan,
  type Db,
  type OperationalQueueKind,
  type StaffRole,
} from '@wariba/database';
import { IDENTITY_REVIEW_STATUS_LABELS } from './control-identity';
import {
  CONTESTATION_STATUS_LABELS,
  SUPPORT_STATUS_LABELS,
  formatAge,
  formatSupportTimestamp,
} from './support-view';

const QUEUE: Record<OperationalQueueKind, { label: string; href: string }> = {
  pass_review: { label: 'Revues de passage', href: '/control/pass-reviews' },
  identity: { label: 'Identité', href: '/control/identity' },
  support: { label: 'Support', href: '/control/support' },
  contestation: { label: 'Contestations', href: '/control/contestations' },
};

function caseHref(kind: OperationalQueueKind, publicId: string): string {
  switch (kind) {
    case 'pass_review':
      return `/control/pass-reviews/${publicId}`;
    case 'identity':
      return `/control/identity/${publicId}`;
    case 'support':
      return `/control/support/${publicId}`;
    case 'contestation':
      return `/control/contestations/${publicId}`;
  }
}

function statusLabel(kind: OperationalQueueKind, status: string): string {
  if (kind === 'support')
    return SUPPORT_STATUS_LABELS[status as keyof typeof SUPPORT_STATUS_LABELS] ?? status;
  if (kind === 'contestation')
    return CONTESTATION_STATUS_LABELS[status as keyof typeof CONTESTATION_STATUS_LABELS] ?? status;
  if (kind === 'identity')
    return (
      IDENTITY_REVIEW_STATUS_LABELS[status as keyof typeof IDENTITY_REVIEW_STATUS_LABELS] ?? status
    );
  return status === 'integrity_escalated' ? 'Doute d’intégrité signalé' : 'À revoir';
}

const ACTION_LABEL: Record<string, string> = {
  'support_ticket.resolved': 'Demande résolue',
  'support_ticket.closed': 'Demande clôturée',
  'support_ticket.information_requested': 'Information demandée',
  'contestation.decision_recorded': 'Décision de contestation',
  'contestation.correction_required': 'Correction requise',
  'contestation.finance_compliance_review_required': 'Examen Finance et Conformité',
  'contestation.replacement_account_issued': 'Compte de remplacement créé',
  'pass_review.reviewed': 'Revue de passage effectuée',
  'pass_review.integrity_escalated': 'Doute d’intégrité signalé',
  'identity_review.decision_recorded': 'Décision d’identité',
  'identity_review.updated': 'Vérification mise à jour',
};

export async function buildControlOverviewView(
  db: Db,
  params: { staffId: string; role: StaffRole; now?: Date },
) {
  const now = params.now ?? new Date();
  const scope = {
    passReview: staffCan(params.role, 'pass_review.read'),
    identity: staffCan(params.role, 'identity_review.read'),
    support: staffCan(params.role, 'support.read'),
    contestation: staffCan(params.role, 'dispute.read'),
  };
  const snapshot = await loadControlOverview(db, { staffId: params.staffId, scope });
  return {
    queues: snapshot.queues.map((queue) => ({
      ...QUEUE[queue.kind],
      kind: queue.kind,
      count: queue.count,
      oldestLabel: queue.oldestAt ? formatAge(queue.oldestAt, now) : 'Aucun dossier',
    })),
    assigned: snapshot.assigned.map((item) => ({
      ...item,
      kindLabel: QUEUE[item.kind].label,
      href: caseHref(item.kind, item.publicId),
      statusLabel: statusLabel(item.kind, item.status),
      ageLabel: formatAge(item.openedAt, now),
    })),
    aging: snapshot.aging.map((item) => ({
      ...item,
      kindLabel: QUEUE[item.kind].label,
      href: caseHref(item.kind, item.publicId),
      statusLabel: statusLabel(item.kind, item.status),
      ageLabel: formatAge(item.openedAt, now),
    })),
    decisions: snapshot.decisions.map((item) => ({
      ...item,
      actionLabel: ACTION_LABEL[item.action] ?? 'Action opérateur',
      occurredAtLabel: formatSupportTimestamp(item.occurredAt),
    })),
  };
}
