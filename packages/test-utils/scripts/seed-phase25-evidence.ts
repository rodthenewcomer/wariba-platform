/**
 * Seeds the accounts the Phase 2.5 visual evidence is captured against.
 *
 * QA tooling. Not part of any build, never imported by production code, and it
 * refuses to run against anything but a local database (see `assertLocal`).
 * Every user it creates is `@wariba-test.invalid`.
 *
 *   pnpm --filter @wariba/test-utils exec tsx scripts/seed-phase25-evidence.ts
 */
import { createDbClient, loadAccountBalanceProjection } from '@wariba/database';
import {
  buildAccountHubView,
  buildAccountMissionView,
  buildAccountRiskView,
  buildCommandCenterView,
  buildJournalView,
  buildPerformanceAnalytics,
  listAccountsForUser,
} from '@wariba/application';
import { E2E_TEST_PASSWORD, createFixtureAccount, createFixtureDb } from '../src/hub-account-fixture';
import { seedTradingRecord } from '../src/trading-record-fixture';

/**
 * A guard, not a formality.
 *
 * This script writes fills and ledger entries. Pointed at a production
 * database it would be inventing financial history on real accounts, which is
 * the single thing the phase brief forbids most explicitly.
 */
function assertLocal(): void {
  const url = process.env.DATABASE_URL ?? '';
  const local = url.includes('127.0.0.1') || url.includes('localhost');
  if (!local) {
    throw new Error(
      `Refusing to seed: DATABASE_URL is not local (${url.replace(/:[^:@]*@/, ':***@')}).`,
    );
  }
}

async function main(): Promise<void> {
  assertLocal();
  const db = createFixtureDb();
  const now = new Date();

  const populated = await createFixtureAccount(db, 'p25-populated', '10K');
  const record = await seedTradingRecord(db, { accountId: populated.accountId, now });

  const fresh = await createFixtureAccount(db, 'p25-fresh', '10K');

  const projection = await loadAccountBalanceProjection(db, populated.accountId);
  const [analytics, journal, hub, risk, mission] = await Promise.all([
    buildPerformanceAnalytics(db, { accountId: populated.accountId }),
    buildJournalView(db, { accountId: populated.accountId }),
    buildAccountHubView(db, { accountId: populated.accountId, now }),
    buildAccountRiskView(db, { accountId: populated.accountId, now }),
    buildAccountMissionView(db, { accountId: populated.accountId, now }),
  ]);

  const accounts = await listAccountsForUser(db, { userId: populated.userId });
  const account = accounts.find((a) => a.id === populated.accountId);
  if (!account) throw new Error('seeded account not found');
  const command = await buildCommandCenterView(db, { account, now });

  console.log('\n=== POPULATED ACCOUNT ===');
  console.log('email         ', populated.email);
  console.log('accountId     ', populated.accountId);
  console.log('trades written', record.tradeCount, '/ sessions', record.sessionCount);
  console.log('');
  console.log('--- coherence: does the ledger agree with the fills? ---');
  console.log('fixture final balance   ', record.finalBalance);
  console.log('ledger projection       ', projection.accountBalance);
  console.log('program-eligible balance', projection.programEligibleBalance);
  console.log('ineligible (short dur.) ', projection.ineligibleShortDurationProfit);
  console.log('fixture net realised    ', record.netRealizedPnl);
  console.log('analytics net P&L       ', analytics.kpis.netPnl);
  console.log('');
  console.log('--- performance KPIs ---');
  console.log('trades      ', analytics.kpis.tradeCount);
  console.log('net P&L     ', analytics.kpis.netPnlFormatted);
  console.log('win rate    ', analytics.kpis.winRatePercent, '%');
  console.log('wins/losses ', analytics.kpis.wins, '/', analytics.kpis.losses);
  console.log('profit fact ', analytics.kpis.profitFactor);
  console.log('avg win     ', analytics.kpis.averageWin);
  console.log('avg loss    ', analytics.kpis.averageLoss);
  console.log('expectancy  ', analytics.kpis.expectancy);
  console.log('best day    ', analytics.kpis.bestDay?.date, analytics.kpis.bestDay?.netPnlFormatted);
  console.log(
    'worst day   ',
    analytics.kpis.worstDay?.date,
    analytics.kpis.worstDay?.netPnlFormatted,
  );
  console.log('trading days', analytics.kpis.tradingDays);
  console.log('streak      ', analytics.kpis.currentStreak);
  console.log('avg duration', analytics.kpis.averageDurationMs, 'ms');
  console.log('by symbol   ', analytics.bySymbol.map((s) => `${s.symbol} ${s.netPnlFormatted}`));
  console.log('by duration ', analytics.byDuration.map((d) => `${d.label} ${d.wins}W/${d.losses}L`));
  console.log('');
  console.log('--- journal ---');
  console.log('entries     ', journal.entries.length);
  console.log('');
  console.log('--- hub / risk / mission ---');
  console.log('balance          ', hub.balanceFormatted, '| raw', hub.amounts.balance);
  console.log('P&L today        ', hub.pnlTodayFormatted, '| raw', hub.amounts.pnlToday);
  console.log('finalised days   ', hub.finalizedSessionCount);
  console.log('history points   ', hub.balanceHistory.length, '| meaningful', hub.balanceHistoryMeaningful);
  console.log('daily P&L points ', hub.dailyPnl.length);
  console.log('daily room       ', risk.dailyLossRemainingFormatted, `(${risk.room.dailyRemainingPercent}%)`);
  console.log('max room         ', risk.maximumLossRemainingFormatted, `(${risk.room.maximumRemainingPercent}%)`);
  console.log('binding          ', risk.room.binding);
  console.log('next reset       ', risk.nextResetAt);
  console.log('objective        ', mission.available ? `${mission.progressPercent}%` : mission.reason);
  console.log('consistency      ', mission.available && mission.consistency
    ? `${mission.consistency.ratioPercent}% / limit ${mission.consistency.limitPercent}%`
    : '—');
  console.log('');
  console.log('--- command center ---');
  console.log('lifecycle         ', command.lifecycle.state, '|', command.lifecycle.label);
  console.log('health            ', command.health.state, '|', command.health.label);
  console.log('meaningful activity', command.hasMeaningfulActivity);
  console.log('thresholds        ', command.thresholds.map((t) => `${t.label} ${t.value}`));

  console.log('\n=== FRESH ACCOUNT ===');
  console.log('email     ', fresh.email);
  console.log('accountId ', fresh.accountId);
  const freshAccounts = await listAccountsForUser(db, { userId: fresh.userId });
  const freshAccount = freshAccounts[0];
  if (freshAccount) {
    const freshCommand = await buildCommandCenterView(db, { account: freshAccount, now });
    console.log('health    ', freshCommand.health.state, '|', freshCommand.health.label);
    console.log('meaningful', freshCommand.hasMeaningfulActivity);
  }

  console.log('\npassword for both:', E2E_TEST_PASSWORD);
  await db.destroy();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

export { createDbClient };
