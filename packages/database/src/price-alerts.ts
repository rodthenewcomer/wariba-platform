import { resolveAlertPrice, isPriceAboveThreshold, shouldTriggerAlert } from '@wariba/domain';
import type { Db } from './client';
import { assertCurrentLeadershipInTransaction, type LeadershipToken } from './realtime-leadership';
import type { AlertDirection, AlertRecurrence, AlertSource, TradableSymbol } from './schema';

/**
 * Prompt 7 Appendix 07-D §16/§17 — server-side price alerts. Evaluated
 * exclusively by services/realtime's tick loop (evaluateAlerts below),
 * never in the browser. User-scoped (not account-scoped): an alert is a
 * personal watch on a symbol's price, unrelated to any specific trading
 * account.
 */

const REJECTION = {
  ALERT_NOT_FOUND: 'alert_not_found',
} as const;

export interface PriceAlertSummary {
  id: string;
  userId: string;
  symbol: TradableSymbol;
  direction: AlertDirection;
  thresholdPrice: string;
  source: AlertSource;
  recurrence: AlertRecurrence;
  enabled: boolean;
  lastObservedSideAbove: boolean | null;
  lastTriggeredAt: Date | null;
  triggerCount: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface PriceAlertRow {
  id: string;
  user_id: string;
  symbol: TradableSymbol;
  direction: AlertDirection;
  threshold_price: string;
  source: AlertSource;
  recurrence: AlertRecurrence;
  enabled: boolean;
  last_observed_side_above: boolean | null;
  last_triggered_at: Date | null;
  trigger_count: number;
  version: number;
  created_at: Date;
  updated_at: Date;
}

function toSummary(row: PriceAlertRow): PriceAlertSummary {
  return {
    id: row.id,
    userId: row.user_id,
    symbol: row.symbol,
    direction: row.direction,
    thresholdPrice: row.threshold_price,
    source: row.source,
    recurrence: row.recurrence,
    enabled: row.enabled,
    lastObservedSideAbove: row.last_observed_side_above,
    lastTriggeredAt: row.last_triggered_at,
    triggerCount: row.trigger_count,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface AlertCommandResult {
  status: 'ok' | 'rejected';
  rejectionCode: string | null;
  alert: PriceAlertSummary | null;
}

export interface CreatePriceAlertParams {
  userId: string;
  idempotencyKey: string;
  symbol: TradableSymbol;
  direction: AlertDirection;
  thresholdPrice: string;
  source?: AlertSource;
  recurrence: AlertRecurrence;
  now: Date;
}

export async function createPriceAlert(
  db: Db,
  params: CreatePriceAlertParams,
): Promise<AlertCommandResult> {
  return db.transaction().execute(async (trx) => {
    const existing = await trx
      .selectFrom('app.price_alerts')
      .selectAll()
      .where('user_id', '=', params.userId)
      .where('idempotency_key', '=', params.idempotencyKey)
      .executeTakeFirst();
    if (existing) {
      return { status: 'ok' as const, rejectionCode: null, alert: toSummary(existing) };
    }
    const inserted = await trx
      .insertInto('app.price_alerts')
      .values({
        user_id: params.userId,
        symbol: params.symbol,
        direction: params.direction,
        threshold_price: params.thresholdPrice,
        source: params.source ?? 'mid',
        recurrence: params.recurrence,
        idempotency_key: params.idempotencyKey,
        created_at: params.now,
        updated_at: params.now,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return { status: 'ok' as const, rejectionCode: null, alert: toSummary(inserted) };
  });
}

export interface ModifyPriceAlertParams {
  userId: string;
  alertId: string;
  thresholdPrice?: string;
  direction?: AlertDirection;
  source?: AlertSource;
  recurrence?: AlertRecurrence;
  now: Date;
}

export async function modifyPriceAlert(
  db: Db,
  params: ModifyPriceAlertParams,
): Promise<AlertCommandResult> {
  return db.transaction().execute(async (trx) => {
    const existing = await trx
      .selectFrom('app.price_alerts')
      .selectAll()
      .where('id', '=', params.alertId)
      .where('user_id', '=', params.userId)
      .executeTakeFirst();
    if (!existing) {
      return { status: 'rejected' as const, rejectionCode: REJECTION.ALERT_NOT_FOUND, alert: null };
    }
    // A threshold/direction change resets the crossing baseline — the next
    // evaluation just re-establishes it, never fires immediately from a
    // stale side observed under the old threshold.
    const thresholdOrDirectionChanged =
      (params.thresholdPrice !== undefined && params.thresholdPrice !== existing.threshold_price) ||
      (params.direction !== undefined && params.direction !== existing.direction);
    const updated = await trx
      .updateTable('app.price_alerts')
      .set({
        threshold_price: params.thresholdPrice ?? existing.threshold_price,
        direction: params.direction ?? existing.direction,
        source: params.source ?? existing.source,
        recurrence: params.recurrence ?? existing.recurrence,
        last_observed_side_above: thresholdOrDirectionChanged
          ? null
          : existing.last_observed_side_above,
        version: existing.version + 1,
        updated_at: params.now,
      })
      .where('id', '=', existing.id)
      .where('version', '=', existing.version)
      .returningAll()
      .executeTakeFirst();
    if (!updated) {
      return { status: 'rejected' as const, rejectionCode: REJECTION.ALERT_NOT_FOUND, alert: null };
    }
    return { status: 'ok' as const, rejectionCode: null, alert: toSummary(updated) };
  });
}

async function setPriceAlertEnabled(
  db: Db,
  params: { userId: string; alertId: string; enabled: boolean; now: Date },
): Promise<AlertCommandResult> {
  return db.transaction().execute(async (trx) => {
    const existing = await trx
      .selectFrom('app.price_alerts')
      .selectAll()
      .where('id', '=', params.alertId)
      .where('user_id', '=', params.userId)
      .executeTakeFirst();
    if (!existing) {
      return { status: 'rejected' as const, rejectionCode: REJECTION.ALERT_NOT_FOUND, alert: null };
    }
    const updated = await trx
      .updateTable('app.price_alerts')
      .set({
        enabled: params.enabled,
        // Re-enabling resets the baseline — see shouldTriggerAlert's doc
        // comment for why a null baseline never fires on its own; this
        // avoids firing immediately off a side observed before the alert
        // was paused, possibly stale by however long it was disabled.
        last_observed_side_above: params.enabled ? null : existing.last_observed_side_above,
        version: existing.version + 1,
        updated_at: params.now,
      })
      .where('id', '=', existing.id)
      .where('version', '=', existing.version)
      .returningAll()
      .executeTakeFirst();
    if (!updated) {
      return { status: 'rejected' as const, rejectionCode: REJECTION.ALERT_NOT_FOUND, alert: null };
    }
    return { status: 'ok' as const, rejectionCode: null, alert: toSummary(updated) };
  });
}

export async function enablePriceAlert(
  db: Db,
  params: { userId: string; alertId: string; now: Date },
): Promise<AlertCommandResult> {
  return setPriceAlertEnabled(db, { ...params, enabled: true });
}

export async function disablePriceAlert(
  db: Db,
  params: { userId: string; alertId: string; now: Date },
): Promise<AlertCommandResult> {
  return setPriceAlertEnabled(db, { ...params, enabled: false });
}

export async function deletePriceAlert(
  db: Db,
  params: { userId: string; alertId: string },
): Promise<AlertCommandResult> {
  const deleted = await db
    .deleteFrom('app.price_alerts')
    .where('id', '=', params.alertId)
    .where('user_id', '=', params.userId)
    .returningAll()
    .executeTakeFirst();
  if (!deleted) {
    return { status: 'rejected', rejectionCode: REJECTION.ALERT_NOT_FOUND, alert: null };
  }
  return { status: 'ok', rejectionCode: null, alert: toSummary(deleted) };
}

export interface AlertNotificationSummary {
  id: string;
  alertId: string;
  userId: string;
  symbol: TradableSymbol;
  direction: AlertDirection;
  thresholdPrice: string;
  triggeringPrice: string;
  source: AlertSource;
  readAt: Date | null;
  occurredAt: Date;
}

/**
 * Called by services/realtime on every fresh tick for `symbol`. Evaluates
 * every enabled alert on that symbol; a triggered alert gets a persisted
 * notification row, its trigger_count/last_triggered_at bumped, and (for a
 * 'once' alert) disabled. last_observed_side_above is updated on *every*
 * evaluation regardless of whether it triggers — that running baseline is
 * what makes shouldTriggerAlert a genuine crossing detector rather than a
 * threshold-equality check.
 */
export async function evaluateAlerts(
  db: Db,
  params: {
    symbol: TradableSymbol;
    tick: { bid: string; ask: string };
    now: Date;
    fencingToken?: LeadershipToken;
  },
): Promise<AlertNotificationSummary[]> {
  const rows = await db
    .selectFrom('app.price_alerts')
    .select('id')
    .where('symbol', '=', params.symbol)
    .where('enabled', '=', true)
    .execute();

  const notifications: AlertNotificationSummary[] = [];
  for (const candidate of rows) {
    const notification = await db.transaction().execute(async (trx) => {
      if (params.fencingToken) {
        await assertCurrentLeadershipInTransaction(trx, params.fencingToken);
      }
      const row = await trx
        .selectFrom('app.price_alerts')
        .selectAll()
        .where('id', '=', candidate.id)
        .where('enabled', '=', true)
        .forUpdate()
        .executeTakeFirst();
      if (!row) return null;

      const price = resolveAlertPrice(row.source, params.tick);
      const currentSideAbove = isPriceAboveThreshold(price, row.threshold_price);
      const fires = shouldTriggerAlert({
        direction: row.direction,
        lastObservedSideAbove: row.last_observed_side_above,
        currentSideAbove,
      });

      if (!fires) {
        await trx
          .updateTable('app.price_alerts')
          .set({ last_observed_side_above: currentSideAbove, updated_at: params.now })
          .where('id', '=', row.id)
          .execute();
        return null;
      }

      const nextTriggerCount = row.trigger_count + 1;
      await trx
        .updateTable('app.price_alerts')
        .set({
          last_observed_side_above: currentSideAbove,
          last_triggered_at: params.now,
          trigger_count: nextTriggerCount,
          enabled: row.recurrence === 'once' ? false : true,
          updated_at: params.now,
        })
        .where('id', '=', row.id)
        .execute();

      const inserted = await trx
        .insertInto('app.alert_notifications')
        .values({
          alert_id: row.id,
          user_id: row.user_id,
          symbol: row.symbol,
          direction: row.direction,
          threshold_price: row.threshold_price,
          triggering_price: price,
          source: row.source,
          trigger_identity: `${row.id}:${nextTriggerCount}`,
          occurred_at: params.now,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return {
        id: inserted.id,
        alertId: inserted.alert_id,
        userId: inserted.user_id,
        symbol: inserted.symbol,
        direction: inserted.direction,
        thresholdPrice: inserted.threshold_price,
        triggeringPrice: inserted.triggering_price,
        source: inserted.source,
        readAt: inserted.read_at,
        occurredAt: inserted.occurred_at,
      };
    });
    if (notification) notifications.push(notification);
  }
  return notifications;
}

export async function loadActiveAlertsForUser(
  db: Db,
  userId: string,
): Promise<PriceAlertSummary[]> {
  const rows = await db
    .selectFrom('app.price_alerts')
    .selectAll()
    .where('user_id', '=', userId)
    .orderBy('created_at', 'asc')
    .execute();
  return rows.map(toSummary);
}

export async function loadNotificationsForUser(
  db: Db,
  params: { userId: string; limit?: number },
): Promise<AlertNotificationSummary[]> {
  const rows = await db
    .selectFrom('app.alert_notifications')
    .selectAll()
    .where('user_id', '=', params.userId)
    .orderBy('occurred_at', 'desc')
    .limit(params.limit ?? 50)
    .execute();
  return rows.map((row) => ({
    id: row.id,
    alertId: row.alert_id,
    userId: row.user_id,
    symbol: row.symbol,
    direction: row.direction,
    thresholdPrice: row.threshold_price,
    triggeringPrice: row.triggering_price,
    source: row.source,
    readAt: row.read_at,
    occurredAt: row.occurred_at,
  }));
}

export async function markNotificationsRead(
  db: Db,
  params: { userId: string; notificationIds: string[]; now: Date },
): Promise<void> {
  if (params.notificationIds.length === 0) return;
  await db
    .updateTable('app.alert_notifications')
    .set({ read_at: params.now })
    .where('user_id', '=', params.userId)
    .where('id', 'in', params.notificationIds)
    .execute();
}
