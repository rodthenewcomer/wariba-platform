'use client';

import type { ReactNode } from 'react';
import type { AccountRisk } from '@wariba/contracts';
import type { OrderRejectionDetail } from './execution-contract';
import type { ExecutionGate } from './execution-gating';

type NoticeLevel = 'warning' | 'danger';

const NOTICE_STYLE: Record<NoticeLevel, string> = {
  warning:
    'border-l-[color:var(--wariba-status-warning-border)] bg-[color:var(--wariba-status-warning-background)] text-[color:var(--wariba-status-warning-text)]',
  danger:
    'border-l-[color:var(--wariba-status-danger-border)] bg-[color:var(--wariba-status-danger-background)] text-[color:var(--wariba-status-danger-text)]',
};

/**
 * W4 §36/§38 — the compact notice the Execution Center uses instead of a
 * stack of full-width `Alert` cards.
 *
 * Same status colours, same roles (`alert` for danger so it is announced
 * assertively, `status` otherwise), a quarter of the vertical cost: a hairline
 * accent on the leading edge rather than a rounded box with 16px padding. The
 * panel is ~320px wide and can legitimately carry a rejection *and* a
 * monitoring notice at once; three stacked cards pushed the actual controls
 * below the fold, which is the specific failure §36 asks to fix.
 */
function ExecutionNotice({
  level,
  title,
  children,
  testId,
}: {
  level: NoticeLevel;
  title: string;
  children?: ReactNode;
  testId?: string;
}) {
  return (
    <div
      role={level === 'danger' ? 'alert' : 'status'}
      {...(testId ? { 'data-testid': testId } : {})}
      className={`flex flex-col gap-0.5 border-l-2 px-2 py-1.5 ${NOTICE_STYLE[level]}`}
    >
      {/*
       * Visual closure §17 — prominent without being tall. The title stays at
       * body size and semibold so the state is unmistakable; the explanation
       * drops to `data-xs` with tight leading, which is what lets a rejection
       * carry its reason, its suggested action *and* its code in the space the
       * reason alone used to take. No content is removed.
       */}
      <p className="text-[length:var(--wariba-font-size-body-sm)] font-semibold leading-tight">
        {title}
      </p>
      {children ? (
        <div className="flex flex-col gap-0.5 text-[length:var(--wariba-font-size-data-xs)] leading-snug">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export interface ExecutionStatusProps {
  gate: ExecutionGate;
  rejection: OrderRejectionDetail | null;
  risk: AccountRisk | null;
}

/**
 * A field error is already displayed on its own field — repeating it here as a
 * banner would add height without adding information.
 */
const FIELD_REASONS = new Set(['invalid_quantity', 'invalid_trigger_price', 'invalid_protection']);

/**
 * W4 §36/§37/§38 — why the trader cannot act, and what the server just said.
 *
 * Rejection comes first and stays put: it is cleared when the next command is
 * issued or succeeds (see `trade-session.ts`), never by an incoming tick, so
 * an answer the server gave cannot be wiped off the screen a few hundred
 * milliseconds later by unrelated market data (§38). Its reason, its suggested
 * action and its code are all preserved — there is no generic "Échec" path.
 *
 * Short-duration monitoring keeps its full explanation (§36): the warning
 * state says the closures remain visible but do not count, and the entry-lock
 * state says plainly that reducing and closing stay available and that no
 * permanent breach has been created.
 */
export function ExecutionStatus({ gate, rejection, risk }: ExecutionStatusProps) {
  const monitoring = risk?.shortDurationMonitoring;
  const showGate = gate.entryBlocked && gate.message && !FIELD_REASONS.has(gate.reason ?? '');
  // The lock already has its own, fuller notice below.
  const gateIsMonitoringLock = gate.reason === 'short_duration_entry_locked';

  if (
    !rejection &&
    !showGate &&
    monitoring?.status !== 'warning' &&
    monitoring?.status !== 'entry_locked'
  ) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5 px-3 pb-1" data-testid="execution-status">
      {rejection ? (
        <ExecutionNotice level="danger" title="Ordre refusé" testId="execution-rejection">
          <p>{rejection.reason}</p>
          <p>{rejection.action}</p>
          {/* §17 — the code stays visible and stays subordinate to the human
              explanation above it. */}
          <p className="wariba-data text-[length:var(--wariba-font-size-data-xs)] opacity-80">
            Code : {rejection.code}
          </p>
        </ExecutionNotice>
      ) : null}

      {showGate && !gateIsMonitoringLock ? (
        <ExecutionNotice level="warning" title="Ordre indisponible" testId="execution-gate">
          {gate.message}
        </ExecutionNotice>
      ) : null}

      {monitoring?.status === 'warning' ? (
        <ExecutionNotice level="warning" title="Profits de très courte durée détectés">
          {monitoring.count24h} clôtures profitables sous 60 secondes sur 24 h. Elles restent
          visibles mais ne comptent pas dans votre progression.
        </ExecutionNotice>
      ) : null}

      {monitoring?.status === 'entry_locked' ? (
        <ExecutionNotice
          level="warning"
          title="Nouvelles ouvertures suspendues"
          testId="execution-entry-lock"
        >
          Vous pouvez toujours réduire ou fermer vos positions. Le verrou suit une fenêtre glissante
          de 24 h ; le signal reste auditable pour revue du risque et aucune violation permanente
          n’est créée automatiquement.
        </ExecutionNotice>
      ) : null}
    </div>
  );
}
