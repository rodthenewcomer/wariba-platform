import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadAccountBalanceProjection, type Db } from '@wariba/database';
import {
  createFixtureAccount,
  createFixtureDb,
  deleteFixtureAccount,
  deleteTradingRecord,
  seedTradingRecord,
  type E2eFixtureAccount,
  type TradingRecordFixture,
} from '@wariba/test-utils';
import { buildAccountHubView, buildCommandCenterView, listAccountsForUser } from '../src/index';

/**
 * Phase 2.5 §35 — the command centre, against a real trading record.
 *
 * Phase 2 shipped these read models with zero rows in `app.fills`, so every
 * figure below was correct by construction and unobserved in practice. The
 * populated fixture exists to end that, and this file is where the figures it
 * produces are checked against each other rather than against expectations
 * typed by the same hand that wrote them.
 *
 * The assertions are deliberately relational — "the ledger agrees with the
 * analytics", "the bar agrees with the label" — because those are the failures
 * a screenshot cannot catch and a hardcoded expected value hides.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb('buildCommandCenterView — populated account', () => {
  let db: Db;
  let populated: E2eFixtureAccount;
  let fresh: E2eFixtureAccount;
  let record: TradingRecordFixture;
  const now = new Date();

  beforeAll(async () => {
    db = createFixtureDb();
    populated = await createFixtureAccount(db, 'cc-populated', '10K');
    record = await seedTradingRecord(db, { accountId: populated.accountId, now });
    fresh = await createFixtureAccount(db, 'cc-fresh', '10K');
  }, 120_000);

  afterAll(async () => {
    if (populated) {
      await deleteTradingRecord(db, populated.accountId);
      await deleteFixtureAccount(db, populated);
    }
    if (fresh) await deleteFixtureAccount(db, fresh);
    await db?.destroy();
  }, 60_000);

  const view = async (fixture: E2eFixtureAccount) => {
    const accounts = await listAccountsForUser(db, { userId: fixture.userId });
    const account = accounts.find((candidate) => candidate.id === fixture.accountId);
    if (!account) throw new Error('fixture account not found');
    return buildCommandCenterView(db, { account, now });
  };

  it('writes a record the ledger and the analytics both agree with', async () => {
    const projection = await loadAccountBalanceProjection(db, populated.accountId);
    const command = await view(populated);

    // The fixture computes its balance by walking the trades; the projection
    // computes it by summing the ledger the fixture wrote. Agreement means the
    // ledger entries genuinely follow from the fills.
    expect(projection.accountBalance).toBe(record.finalBalance);
    expect(command.hub.amounts.balance).toBe(record.finalBalance);
    expect(command.performance.kpis.netPnl).toBe(record.netRealizedPnl);
  });

  it('excludes short-duration profit from the program-eligible balance', async () => {
    const projection = await loadAccountBalanceProjection(db, populated.accountId);
    // The record holds one deliberate sub-minute winner. If the two balances
    // are equal the eligibility rule did not fire and the fixture has stopped
    // covering the branch it was written to cover.
    expect(Number(projection.ineligibleShortDurationProfit)).toBeGreaterThan(0);
    expect(Number(projection.programEligibleBalance)).toBeLessThan(
      Number(projection.accountBalance),
    );
  });

  /**
   * The regression this phase found.
   *
   * `pnlToday` subtracted `dailyLoss.reference`, which `ensureTodaySnapshot`
   * derives from the program-*eligible* balance. On an account carrying
   * ineligible short-duration profit the difference is that profit — so a
   * dashboard reported a trade from three days ago as today's P&L, on every
   * subsequent day, indefinitely.
   */
  it('reports no P&L today for an account that has not traded today', async () => {
    const hub = await buildAccountHubView(db, { accountId: populated.accountId, now });
    expect(hub.amounts.pnlToday).toBe('0.00');
    expect(hub.pnlTodayFormatted).not.toContain('+3');
  });

  it('surfaces a record worth drawing', async () => {
    const command = await view(populated);
    expect(command.performance.kpis.tradeCount).toBe(record.tradeCount);
    expect(command.performance.empty).toBe(false);
    expect(command.hub.finalizedSessionCount).toBe(record.sessionCount);
    expect(command.hub.balanceHistoryMeaningful).toBe(true);
    expect(command.hub.dailyPnl).toHaveLength(record.sessionCount);
    // Wins and losses both, or the record is not a record.
    expect(command.performance.kpis.wins).toBeGreaterThan(0);
    expect(command.performance.kpis.losses).toBeGreaterThan(0);
    expect(command.performance.bySymbol.length).toBeGreaterThan(1);
    expect(command.performance.byDuration.length).toBeGreaterThan(1);
  });

  it('keeps the risk bars and the risk labels describing one account', async () => {
    const command = await view(populated);
    const { room, amounts } = command.risk;

    expect(room.dailyRemainingPercent).toBeGreaterThanOrEqual(0);
    expect(room.dailyRemainingPercent).toBeLessThanOrEqual(100);
    expect(room.maximumRemainingPercent).toBeGreaterThanOrEqual(0);
    expect(room.maximumRemainingPercent).toBeLessThanOrEqual(100);

    // A bar at 0 % beside a label with money left on it is the disagreement
    // projecting the ratio once is meant to prevent.
    if (Number(amounts.dailyLossRemaining) > 0) {
      expect(room.dailyRemainingPercent).toBeGreaterThan(0);
    }
    const binding =
      room.dailyRemainingPercent <= room.maximumRemainingPercent ? 'daily' : 'maximum';
    expect(room.binding).toBe(binding);
  });

  it('exposes a reset instant the countdown can be built on', async () => {
    const command = await view(populated);
    const reset = new Date(command.risk.nextResetAt);
    expect(reset.getUTCHours()).toBe(0);
    expect(reset.getTime()).toBeGreaterThan(now.getTime());
    expect(reset.getTime() - now.getTime()).toBeLessThanOrEqual(24 * 3_600_000);
  });

  it('draws thresholds from the rulebook, not from the chart', async () => {
    const command = await view(populated);
    const floor = command.thresholds.find((t) => t.label === 'Perte max.');
    const target = command.thresholds.find((t) => t.label === 'Objectif');
    expect(floor?.value).toBe(Number(command.risk.amounts.maximumLossFloor));
    expect(target).toBeDefined();
    // The objective must sit above the floor, or the account is unwinnable.
    expect(target?.value).toBeGreaterThan(floor?.value ?? 0);
  });

  it('does not manufacture an equity series (§8)', async () => {
    const command = await view(populated);
    // Balance history is the only historical series. Nothing on the view
    // offers a second one, because nothing authoritative exists to fill it.
    expect(command.hub.balanceHistory.length).toBeGreaterThan(0);
    expect(command.hub).not.toHaveProperty('equityHistory');
  });
});

describeIfDb('buildCommandCenterView — fresh account', () => {
  let db: Db;
  let fresh: E2eFixtureAccount;
  const now = new Date();

  beforeAll(async () => {
    db = createFixtureDb();
    fresh = await createFixtureAccount(db, 'cc-fresh-only', '10K');
  }, 120_000);

  afterAll(async () => {
    if (fresh) await deleteFixtureAccount(db, fresh);
    await db?.destroy();
  }, 60_000);

  const view = async () => {
    const accounts = await listAccountsForUser(db, { userId: fresh.userId });
    const account = accounts[0];
    if (!account) throw new Error('fixture account not found');
    return buildCommandCenterView(db, { account, now });
  };

  it('does not praise an account that has never traded (§11)', async () => {
    const command = await view();
    expect(command.hasMeaningfulActivity).toBe(false);
    expect(command.health.state).toBe('untested');
    expect(command.health.label).toBe('Risque intact');
    expect(command.health.label).not.toBe('Excellent');
  });

  it('reports no performance rather than zeroed performance', async () => {
    const command = await view();
    expect(command.performance.empty).toBe(true);
    expect(command.performance.kpis.tradeCount).toBe(0);
    // Null, never 0 — a 0 % win rate is a claim the trader lost every trade.
    expect(command.performance.kpis.winRatePercent).toBeNull();
    expect(command.performance.kpis.profitFactor).toBeNull();
    expect(command.performance.kpis.averageWin).toBeNull();
  });

  it('still has full risk telemetry to render, so the page is not empty', async () => {
    const command = await view();
    // §5's truthful density: a fresh account already knows all of this.
    expect(command.risk.room.dailyRemainingPercent).toBe(100);
    expect(command.risk.room.maximumRemainingPercent).toBe(100);
    expect(Number(command.risk.amounts.dailyLossBudget)).toBeGreaterThan(0);
    expect(Number(command.risk.amounts.maximumLossBudget)).toBeGreaterThan(0);
    expect(command.thresholds.length).toBeGreaterThan(0);
    expect(command.lifecycle.tradable).toBe(true);
  });

  it('declines to draw a chart from a single opening balance', async () => {
    const command = await view();
    expect(command.hub.balanceHistoryMeaningful).toBe(false);
    expect(command.hub.dailyPnl).toHaveLength(0);
  });
});
