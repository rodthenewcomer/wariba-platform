import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import {
  createPriceAlert,
  modifyPriceAlert,
  enablePriceAlert,
  disablePriceAlert,
  deletePriceAlert,
  evaluateAlerts,
  loadActiveAlertsForUser,
  loadNotificationsForUser,
  markNotificationsRead,
} from '../src/price-alerts';

/**
 * Prompt 7 Appendix 07-D §16/§17 — real integration tests for server-side
 * price alerts, against the live hosted database. Requires DATABASE_URL in
 * the environment (via .env.local, gitignored) — same convention as
 * position-reduction-queue.integration.test.ts. Alerts are user-scoped, not
 * account-scoped (a personal watch on a symbol, unrelated to any specific
 * trading account), so unlike the other integration test files here this
 * one never creates a trading_accounts row.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

const NOW = new Date();

describeIfDb('price-alerts — real database', () => {
  let db: Db;
  let userId: string;

  const createTestUser = async (email: string): Promise<string> => {
    const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password: randomUUID(), email_confirm: true }),
    });
    const body = (await res.json()) as { id: string };
    return body.id;
  };

  const deleteTestUser = async (id: string): Promise<void> => {
    await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${id}`, {
      method: 'DELETE',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
  };

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    userId = await createTestUser(`price-alerts-test-${Date.now()}@wariba-test.invalid`);
  }, 60000);

  afterAll(async () => {
    await db.deleteFrom('app.alert_notifications').where('user_id', '=', userId).execute();
    await db.deleteFrom('app.price_alerts').where('user_id', '=', userId).execute();
    await deleteTestUser(userId);
    await db.destroy();
  }, 60000);

  it('creates an alert and is idempotent on replay', async () => {
    const idempotencyKey = randomUUID();
    const params = {
      userId,
      idempotencyKey,
      symbol: 'EURUSD' as const,
      direction: 'cross_above' as const,
      thresholdPrice: '1.10000',
      recurrence: 'once' as const,
      now: NOW,
    };
    const first = await createPriceAlert(db, params);
    expect(first.status).toBe('ok');
    expect(first.alert?.enabled).toBe(true);
    expect(first.alert?.source).toBe('mid'); // default when omitted

    const second = await createPriceAlert(db, params);
    expect(second.alert?.id).toBe(first.alert?.id);

    const active = await loadActiveAlertsForUser(db, userId);
    expect(active.filter((a) => a.id === first.alert?.id)).toHaveLength(1);
  });

  it('resets the crossing baseline when the threshold or direction changes, but not otherwise', async () => {
    const created = await createPriceAlert(db, {
      userId,
      idempotencyKey: randomUUID(),
      symbol: 'GBPUSD',
      direction: 'cross_above',
      thresholdPrice: '1.30000',
      source: 'bid',
      recurrence: 'once',
      now: NOW,
    });
    const alertId = created.alert!.id;

    // Establish a baseline via one evaluation below the threshold.
    await evaluateAlerts(db, {
      symbol: 'GBPUSD',
      tick: { bid: '1.29000', ask: '1.29010' },
      now: NOW,
    });
    const afterBaseline = await loadActiveAlertsForUser(db, userId);
    expect(afterBaseline.find((a) => a.id === alertId)?.lastObservedSideAbove).toBe(false);

    // Changing source only (not threshold/direction) must NOT reset it.
    const sourceOnly = await modifyPriceAlert(db, {
      userId,
      alertId,
      source: 'ask',
      now: NOW,
    });
    expect(sourceOnly.alert?.lastObservedSideAbove).toBe(false);

    // Changing the threshold must reset it to null.
    const thresholdChanged = await modifyPriceAlert(db, {
      userId,
      alertId,
      thresholdPrice: '1.31000',
      now: NOW,
    });
    expect(thresholdChanged.alert?.lastObservedSideAbove).toBe(null);
    expect(thresholdChanged.alert?.version).toBe((sourceOnly.alert?.version ?? 0) + 1);
  });

  it('rejects modifying an alert that does not belong to this user or does not exist', async () => {
    const result = await modifyPriceAlert(db, {
      userId,
      alertId: randomUUID(),
      thresholdPrice: '1.00000',
      now: NOW,
    });
    expect(result.status).toBe('rejected');
    expect(result.rejectionCode).toBe('alert_not_found');
  });

  it('does not fire on the very first evaluation — it only establishes the baseline', async () => {
    const created = await createPriceAlert(db, {
      userId,
      idempotencyKey: randomUUID(),
      symbol: 'USDJPY',
      direction: 'cross_above',
      thresholdPrice: '150.500',
      source: 'mid',
      recurrence: 'once',
      now: NOW,
    });

    // Above the threshold on the very first tick this alert ever sees — a
    // naive threshold-equality check might fire immediately; a genuine
    // crossing detector must not, since there was no prior side to cross
    // from (shouldTriggerAlert's own documented behavior).
    const notifications = await evaluateAlerts(db, {
      symbol: 'USDJPY',
      tick: { bid: '150.600', ask: '150.620' },
      now: NOW,
    });
    expect(notifications.filter((n) => n.alertId === created.alert!.id)).toHaveLength(0);

    const active = await loadActiveAlertsForUser(db, userId);
    expect(active.find((a) => a.id === created.alert!.id)?.lastObservedSideAbove).toBe(true);
  });

  it('fires exactly once on a genuine crossing, records a notification, and disables a "once" alert afterward', async () => {
    const created = await createPriceAlert(db, {
      userId,
      idempotencyKey: randomUUID(),
      symbol: 'XAUUSD',
      direction: 'cross_above',
      thresholdPrice: '2010.00',
      source: 'mid',
      recurrence: 'once',
      now: NOW,
    });
    const alertId = created.alert!.id;

    // Baseline: below the threshold.
    await evaluateAlerts(db, {
      symbol: 'XAUUSD',
      tick: { bid: '2005.00', ask: '2005.20' },
      now: NOW,
    });

    // Crosses above — must fire now.
    const fired = await evaluateAlerts(db, {
      symbol: 'XAUUSD',
      tick: { bid: '2012.00', ask: '2012.20' },
      now: new Date(NOW.getTime() + 1_000),
    });
    const firedForThisAlert = fired.filter((n) => n.alertId === alertId);
    expect(firedForThisAlert).toHaveLength(1);
    expect(firedForThisAlert[0]?.triggeringPrice).toBe('2012.10'); // mid of 2012.00/2012.20

    const afterFire = await loadActiveAlertsForUser(db, userId);
    const alert = afterFire.find((a) => a.id === alertId);
    expect(alert?.enabled).toBe(false); // 'once' disables itself
    expect(alert?.triggerCount).toBe(1);

    // Still "above" on the next tick — a disabled alert must never fire
    // again even though the price condition is trivially still true.
    const stillAbove = await evaluateAlerts(db, {
      symbol: 'XAUUSD',
      tick: { bid: '2015.00', ask: '2015.20' },
      now: new Date(NOW.getTime() + 2_000),
    });
    expect(stillAbove.filter((n) => n.alertId === alertId)).toHaveLength(0);

    const notifications = await loadNotificationsForUser(db, { userId });
    expect(notifications.some((n) => n.alertId === alertId)).toBe(true);
  });

  it('an "every_crossing" alert stays enabled and can fire again on a subsequent crossing', async () => {
    const created = await createPriceAlert(db, {
      userId,
      idempotencyKey: randomUUID(),
      symbol: 'NAS100',
      direction: 'cross_below',
      thresholdPrice: '18000.0',
      source: 'mid',
      recurrence: 'every_crossing',
      now: NOW,
    });
    const alertId = created.alert!.id;

    await evaluateAlerts(db, {
      symbol: 'NAS100',
      tick: { bid: '18100.0', ask: '18102.0' },
      now: NOW,
    }); // baseline: above

    const firstFire = await evaluateAlerts(db, {
      symbol: 'NAS100',
      tick: { bid: '17900.0', ask: '17902.0' },
      now: new Date(NOW.getTime() + 1_000),
    });
    expect(firstFire.filter((n) => n.alertId === alertId)).toHaveLength(1);

    const stillEnabled = await loadActiveAlertsForUser(db, userId);
    expect(stillEnabled.find((a) => a.id === alertId)?.enabled).toBe(true);

    // Crosses back above, then below again — must fire a second time.
    await evaluateAlerts(db, {
      symbol: 'NAS100',
      tick: { bid: '18050.0', ask: '18052.0' },
      now: new Date(NOW.getTime() + 2_000),
    });
    const secondFire = await evaluateAlerts(db, {
      symbol: 'NAS100',
      tick: { bid: '17950.0', ask: '17952.0' },
      now: new Date(NOW.getTime() + 3_000),
    });
    expect(secondFire.filter((n) => n.alertId === alertId)).toHaveLength(1);

    const afterTwoFires = await loadActiveAlertsForUser(db, userId);
    expect(afterTwoFires.find((a) => a.id === alertId)?.triggerCount).toBe(2);
  });

  it('re-enabling a disabled alert resets its baseline so it never fires immediately off a stale side', async () => {
    const created = await createPriceAlert(db, {
      userId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      direction: 'cross_above',
      thresholdPrice: '1.20000',
      source: 'mid',
      recurrence: 'once',
      now: NOW,
    });
    const alertId = created.alert!.id;

    await evaluateAlerts(db, {
      symbol: 'EURUSD',
      tick: { bid: '1.19000', ask: '1.19010' },
      now: NOW,
    });
    const disabled = await disablePriceAlert(db, { userId, alertId, now: NOW });
    expect(disabled.alert?.enabled).toBe(false);
    // Disabling on its own does not clear the baseline (only re-enabling
    // does) — see setPriceAlertEnabled's own doc comment.
    expect(disabled.alert?.lastObservedSideAbove).toBe(false);

    const reEnabled = await enablePriceAlert(db, { userId, alertId, now: NOW });
    expect(reEnabled.status).toBe('ok');
    expect(reEnabled.alert?.enabled).toBe(true);
    expect(reEnabled.alert?.lastObservedSideAbove).toBe(null);
  });

  it('deletes an alert, and rejects deleting it again', async () => {
    const created = await createPriceAlert(db, {
      userId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      direction: 'cross_above',
      thresholdPrice: '1.25000',
      recurrence: 'once',
      now: NOW,
    });
    const alertId = created.alert!.id;

    const deleted = await deletePriceAlert(db, { userId, alertId });
    expect(deleted.status).toBe('ok');

    const active = await loadActiveAlertsForUser(db, userId);
    expect(active.some((a) => a.id === alertId)).toBe(false);

    const secondDelete = await deletePriceAlert(db, { userId, alertId });
    expect(secondDelete.status).toBe('rejected');
    expect(secondDelete.rejectionCode).toBe('alert_not_found');
  });

  it('marks notifications read, scoped to their own user', async () => {
    const created = await createPriceAlert(db, {
      userId,
      idempotencyKey: randomUUID(),
      symbol: 'GBPUSD',
      direction: 'cross_above',
      thresholdPrice: '1.40000',
      source: 'mid',
      recurrence: 'once',
      now: NOW,
    });
    await evaluateAlerts(db, {
      symbol: 'GBPUSD',
      tick: { bid: '1.39000', ask: '1.39010' },
      now: NOW,
    });
    await evaluateAlerts(db, {
      symbol: 'GBPUSD',
      tick: { bid: '1.41000', ask: '1.41010' },
      now: new Date(NOW.getTime() + 1_000),
    });

    const before = await loadNotificationsForUser(db, { userId });
    const unread = before.filter((n) => n.alertId === created.alert!.id && n.readAt === null);
    expect(unread).toHaveLength(1);

    await markNotificationsRead(db, {
      userId,
      notificationIds: unread.map((n) => n.id),
      now: new Date(NOW.getTime() + 2_000),
    });

    const after = await loadNotificationsForUser(db, { userId });
    const stillUnread = after.filter((n) => n.alertId === created.alert!.id && n.readAt === null);
    expect(stillUnread).toHaveLength(0);
  });
});
