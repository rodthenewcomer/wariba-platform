import {
  isWithinWeeklyClosure,
  type MarketStatus,
  type RealtimeContinuation,
} from '@wariba/contracts';

/**
 * Presentation-only market states.
 *
 * This resolver never authorizes an order and never changes the provider,
 * history or realtime contracts. Execution continues to use the canonical
 * MarketTick.marketStatus; this layer only decides how the workstation
 * explains the data already on screen.
 */
export type WariXMarketDisplayState =
  'LIVE' | 'MARKET_CLOSED' | 'DELAYED' | 'STALE' | 'HISTORY_ONLY' | 'UNAVAILABLE';

export interface ResolveWariXMarketDisplayStateInput {
  marketStatus: MarketStatus | null;
  historyStatus?: 'idle' | 'loading' | 'ready' | 'empty' | 'error';
  realtimeContinuation?: RealtimeContinuation;
  hasUsableHistory?: boolean;
  delayed?: boolean;
  /** Epoch milliseconds; injectable so the weekend rule is deterministic in tests. */
  nowMs?: number;
}

export interface WariXMarketDisplayPresentation {
  state: WariXMarketDisplayState;
  label: string;
  description: string | null;
  tone: 'neutral' | 'information' | 'warning' | 'danger' | 'success';
  blocksPlot: boolean;
}

const PRESENTATION: Record<
  WariXMarketDisplayState,
  Omit<WariXMarketDisplayPresentation, 'state'>
> = {
  LIVE: {
    label: 'Marché ouvert',
    description: null,
    tone: 'success',
    blocksPlot: false,
  },
  MARKET_CLOSED: {
    label: 'Marché fermé',
    description: 'Le dernier cours disponible reste affiché.',
    tone: 'neutral',
    blocksPlot: false,
  },
  DELAYED: {
    label: 'Données différées',
    description: 'Les cours peuvent apparaître avec un léger retard.',
    tone: 'information',
    blocksPlot: false,
  },
  STALE: {
    label: 'Cours non actualisé',
    description: 'Le graphique conserve les dernières données disponibles.',
    tone: 'warning',
    blocksPlot: false,
  },
  HISTORY_ONLY: {
    label: 'Historique disponible · temps réel indisponible',
    description: 'Les bougies historiques restent consultables.',
    tone: 'information',
    blocksPlot: false,
  },
  UNAVAILABLE: {
    label: 'Cours indisponible',
    description: 'Nous ne pouvons pas charger cet instrument pour le moment.',
    tone: 'danger',
    blocksPlot: true,
  },
};

export function resolveWariXMarketDisplayState(
  input: ResolveWariXMarketDisplayStateInput,
): WariXMarketDisplayPresentation {
  const hasUsableHistory = input.hasUsableHistory ?? input.historyStatus === 'ready';
  const nowSeconds = Math.floor((input.nowMs ?? Date.now()) / 1_000);
  let state: WariXMarketDisplayState;

  if (
    (input.marketStatus !== null || hasUsableHistory) &&
    (input.marketStatus === 'closed' || isWithinWeeklyClosure(nowSeconds))
  ) {
    state = 'MARKET_CLOSED';
  } else if (input.delayed === true) {
    state = 'DELAYED';
  } else if (
    hasUsableHistory &&
    input.realtimeContinuation !== undefined &&
    input.realtimeContinuation !== 'attached'
  ) {
    state = 'HISTORY_ONLY';
  } else if (input.marketStatus === 'stale') {
    state = 'STALE';
  } else if (input.marketStatus === 'open') {
    state = 'LIVE';
  } else if (hasUsableHistory) {
    state = 'HISTORY_ONLY';
  } else {
    state = 'UNAVAILABLE';
  }

  return { state, ...PRESENTATION[state] };
}
