/**
 * Section 07's demo dataset — Trader Hub, Analytics and Journal.
 *
 * Everything here is a fabricated marketing illustration, not a customer
 * result. It exists to give the three surfaces something plausible and
 * internally consistent to show — the same trades appear as rows in the
 * Journal, compressed activity in the Trader Hub, and points on the
 * Analytics chart — so the section reads as one connected product rather
 * than three unrelated screenshots. It is never read by, or written from,
 * the authenticated product.
 */

export type Section07Direction = 'LONG' | 'SHORT';
export type Section07Range = '7J' | '30J' | '90J';

/** `1284` → `"1 284 €"` — French grouping, always unsigned. */
export function formatEuro(value: number): string {
  return `${Math.round(Math.abs(value)).toLocaleString('fr-FR')} €`;
}

/** `341` → `"+341 €"`, `-163` → `"−163 €"` — a sign the eye can read without color. */
export function formatSigned(value: number): string {
  if (value > 0) return `+${formatEuro(value)}`;
  if (value < 0) return `−${formatEuro(value)}`;
  return formatEuro(value);
}

/** `-1.8` → `"−1,8 %"`, `0` → `"0,0 %"` — for a figure that reads naturally negative, like drawdown. */
export function formatSignedPercent(value: number, digits = 1): string {
  const sign = value < 0 ? '−' : value > 0 ? '+' : '';
  return `${sign}${formatPercent(Math.abs(value), digits)}`;
}

/** `1.74` → `"1,74"` — French decimal comma, two places. */
export function formatFactor(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

/** `61.8` → `"61,8%"`. */
export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits).replace('.', ',')}%`;
}

/** `38` → `"38"` — a whole count, animated like everything else. */
export function formatCount(value: number): string {
  return Math.round(value).toLocaleString('fr-FR');
}

export interface Section07Account {
  productLabel: string;
  sizeLabel: string;
  stateLabel: string;
  progressPercent: number;
  progressLabel: string;
  targetLabel: string;
  nextMilestoneLabel: string;
  riskDailyPercent: number;
  riskMaxPercent: number;
  riskRemainingLabel: string;
  nextAction: { title: string; detail: string };
}

export const ACCOUNT: Section07Account = {
  productLabel: 'FLEX',
  sizeLabel: '25K',
  stateLabel: 'ÉVALUATION',
  progressPercent: 64,
  progressLabel: '6,4 / 10 %',
  targetLabel: 'Objectif',
  nextMilestoneLabel: 'Performance dans 3,6 pts',
  riskDailyPercent: 84,
  riskMaxPercent: 76,
  riskRemainingLabel: '82 % restant',
  nextAction: {
    title: 'Continuez à trader dans les limites actuelles.',
    detail: 'Votre risque quotidien reste confortable.',
  },
};

export interface Section07Trade {
  id: string;
  direction: Section07Direction;
  instrument: string;
  dateLabel: string;
  timeLabel: string;
  session: string;
  resultValue: number;
  setup: string;
  durationLabel: string;
  outcomeLabel: string;
  entryPrice: number;
  exitPrice: number;
  stopPrice: number;
  targetPrice: number;
  /** A relative price path for the trade's mini-chart — unitless. */
  path: readonly number[];
  note: string;
}

export const JOURNAL_TRADES: readonly Section07Trade[] = [
  {
    id: 'xauusd-10mai-1403',
    direction: 'LONG',
    instrument: 'XAUUSD',
    dateLabel: '10 mai',
    timeLabel: '14:03',
    session: 'New York',
    resultValue: 341.2,
    setup: 'Breakout',
    durationLabel: '42 min',
    outcomeLabel: '+1.4R',
    entryPrice: 2387.4,
    exitPrice: 2394.2,
    stopPrice: 2382.9,
    targetPrice: 2396.5,
    path: [0, 2, 1, 4, 3, 7, 6, 10, 9, 13, 12, 16, 15, 19],
    note: 'Confluence H1 et rupture de range, volume en hausse. Entrée après confirmation.',
  },
  {
    id: 'nas100-10mai-1115',
    direction: 'SHORT',
    instrument: 'NAS100',
    dateLabel: '10 mai',
    timeLabel: '11:15',
    session: 'Londres',
    resultValue: -162.8,
    setup: 'Reversal',
    durationLabel: '18 min',
    outcomeLabel: '−0.6R',
    entryPrice: 18_412,
    exitPrice: 18_447,
    stopPrice: 18_452,
    targetPrice: 18_360,
    path: [0, -1, -3, -2, -5, -4, -7, -6, -9, -8, -11],
    note: 'Rejet sur zone de liquidité, faiblesse M15. Sortie anticipée à la cassure du range.',
  },
  {
    id: 'eurusd-10mai-0942',
    direction: 'LONG',
    instrument: 'EURUSD',
    dateLabel: '10 mai',
    timeLabel: '09:42',
    session: 'Londres',
    resultValue: 276.45,
    setup: 'Trend',
    durationLabel: '1 h 04',
    outcomeLabel: '+1.1R',
    entryPrice: 1.0742,
    exitPrice: 1.0779,
    stopPrice: 1.0721,
    targetPrice: 1.0791,
    path: [0, 1, 2, 4, 3, 6, 8, 7, 10, 12, 11, 14, 16, 15, 18],
    note: 'Confluence H1 et rupture de range, volume en hausse.',
  },
  {
    id: 'xauusd-9mai-1630',
    direction: 'LONG',
    instrument: 'XAUUSD',
    dateLabel: '9 mai',
    timeLabel: '16:30',
    session: 'New York',
    resultValue: 94.6,
    setup: 'Breakout',
    durationLabel: '26 min',
    outcomeLabel: '+0.4R',
    entryPrice: 2379.1,
    exitPrice: 2382.4,
    stopPrice: 2376.8,
    targetPrice: 2384.6,
    path: [0, 1, -1, 2, 1, 4, 3, 6, 5, 8],
    note: 'Deuxième tentative après un premier rejet propre.',
  },
  {
    id: 'gbpusd-9mai-0810',
    direction: 'SHORT',
    instrument: 'GBPUSD',
    dateLabel: '9 mai',
    timeLabel: '08:10',
    session: 'Londres',
    resultValue: -58.3,
    setup: 'Range',
    durationLabel: '12 min',
    outcomeLabel: '−0.2R',
    entryPrice: 1.2634,
    exitPrice: 1.2649,
    stopPrice: 1.2652,
    targetPrice: 1.2609,
    path: [0, -1, 1, -2, -1, -4, -3, -5],
    note: 'Sortie anticipée, structure non confirmée.',
  },
] as const;

export interface Section07AnalyticsPoint {
  label: string;
  value: number;
  trades: number;
  winRatePercent: number;
}

export interface Section07AnalyticsFrame {
  netPnl: number;
  netPnlDeltaLabel: string;
  winRatePercent: number;
  winsCount: number;
  lossesCount: number;
  profitFactorValue: number;
  averageWinValue: number;
  averageLossValue: number;
  bestDayValue: number;
  tradesCount: number;
  expectancyValue: number;
  points: readonly Section07AnalyticsPoint[];
}

function point(label: string, value: number, trades: number, winRatePercent: number): Section07AnalyticsPoint {
  return { label, value, trades, winRatePercent };
}

export const ANALYTICS_BY_RANGE: Record<Section07Range, Section07AnalyticsFrame> = {
  '7J': {
    netPnl: 552.85,
    netPnlDeltaLabel: '+11,4 % vs période précédente',
    winRatePercent: 64.3,
    winsCount: 9,
    lossesCount: 5,
    profitFactorValue: 1.58,
    averageWinValue: 118.4,
    averageLossValue: -61.2,
    bestDayValue: 213.4,
    tradesCount: 14,
    expectancyValue: 39.5,
    points: [
      point('4 mai', -42, 1, 0),
      point('4 mai', -18, 2, 50),
      point('5 mai', 26, 2, 50),
      point('5 mai', 68, 2, 100),
      point('6 mai', 34, 1, 50),
      point('6 mai', 96, 3, 66.7),
      point('7 mai', 151, 3, 66.7),
      point('7 mai', 118, 1, 0),
      point('8 mai', 189, 2, 100),
      point('9 mai', 213, 1, 100),
      point('9 mai', 176, 1, 0),
      point('10 mai', 341, 2, 100),
      point('10 mai', 552.85, 2, 100),
    ],
  },
  '30J': {
    netPnl: 1284.4,
    netPnlDeltaLabel: '+8,2 % vs période précédente',
    winRatePercent: 61.8,
    winsCount: 23,
    lossesCount: 15,
    profitFactorValue: 1.74,
    averageWinValue: 82.3,
    averageLossValue: -47.6,
    bestDayValue: 341.2,
    tradesCount: 38,
    expectancyValue: 33.8,
    /*
     * Shaped as believable cumulative performance, not a staircase: a small
     * early drawdown, recovery, a consolidation band, an acceleration into a
     * local top, one meaningful pullback, recovery into a new high, a
     * smaller late pullback, then continuation to the period's close.
     */
    points: [
      point('11 avr', -180, 2, 0),
      point('12 avr', -230, 1, 0),
      point('13 avr', -160, 2, 50),
      point('14 avr', -80, 1, 100),
      point('15 avr', 40, 2, 100),
      point('16 avr', 120, 2, 100),
      point('17 avr', 205, 2, 50),
      point('18 avr', 280, 1, 100),
      point('19 avr', 365, 2, 50),
      point('20 avr', 455, 2, 100),
      point('22 avr', 510, 1, 100),
      point('23 avr', 470, 2, 0),
      point('25 avr', 590, 2, 100),
      point('26 avr', 680, 1, 100),
      point('28 avr', 790, 2, 50),
      point('29 avr', 910, 2, 100),
      point('30 avr', 845, 1, 0),
      point('1 mai', 980, 2, 100),
      point('3 mai', 1080, 1, 100),
      point('5 mai', 1165, 2, 50),
      point('7 mai', 1095, 1, 0),
      point('10 mai', 1284.4, 2, 100),
    ],
  },
  '90J': {
    netPnl: 2916.1,
    netPnlDeltaLabel: '+21,6 % vs période précédente',
    winRatePercent: 59.1,
    winsCount: 60,
    lossesCount: 41,
    profitFactorValue: 1.61,
    averageWinValue: 76.8,
    averageLossValue: -52.4,
    bestDayValue: 412.9,
    tradesCount: 101,
    expectancyValue: 28.9,
    points: [
      point('10 fév', -320, 6, 33.3),
      point('20 fév', -410, 8, 25),
      point('2 mars', 96, 9, 66.7),
      point('12 mars', 218, 10, 60),
      point('22 mars', -60, 8, 37.5),
      point('1 avr', 380, 11, 63.6),
      point('12 avr', 641, 12, 66.7),
      point('19 avr', 890, 10, 60),
      point('26 avr', 1128, 9, 55.6),
      point('2 mai', 1560, 11, 63.6),
      point('6 mai', 1842, 9, 66.7),
      point('10 mai', 2916.1, 8, 62.5),
    ],
  },
};

export interface Section07EquityPoint {
  label: string;
  balance: number;
  equity: number;
  /** Distance from the running equity high, always ≤ 0 — the classic drawdown read. */
  drawdownPercent: number;
}

/** Balance vs equity secondary visual — derived, not authored twice. */
export function balanceEquitySeries(
  frame: Section07AnalyticsFrame,
  baseline = 25_000,
): readonly Section07EquityPoint[] {
  let peak = baseline;
  return frame.points.map((entry, index) => {
    const balance = baseline + entry.value;
    const wobble = Math.sin(index * 1.7) * Math.max(18, Math.abs(entry.value) * 0.04);
    const equity = balance + wobble;
    peak = Math.max(peak, equity);
    const drawdownPercent = ((equity - peak) / peak) * 100;
    return { label: entry.label, balance, equity, drawdownPercent };
  });
}

export interface Section07ActivityRow {
  id: string;
  direction: Section07Direction;
  instrument: string;
  timeLabel: string;
  resultValue: number;
}

/** The Trader Hub's compact strip — the same trades the Journal shows in full. */
export const RECENT_ACTIVITY: readonly Section07ActivityRow[] = JOURNAL_TRADES.slice(0, 3).map(
  (trade) => ({
    id: trade.id,
    direction: trade.direction,
    instrument: trade.instrument,
    timeLabel: trade.timeLabel,
    resultValue: trade.resultValue,
  }),
);
