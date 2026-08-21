/**
 * @wariba/adapters — Provider port interfaces (market data, payment, payout, email, storage, KYC, feature flags) with sandbox/mock implementations.
 *
 * Prompt 03 adds the PaymentProvider port and SandboxPaymentProvider.
 * Prompt 04 adds the MarketDataProvider port and MockMarketDataProvider
 * (renamed from SandboxMarketDataProvider in Prompt 07B to match the
 * mock/replay/fcs provider naming used throughout that prompt).
 * Prompt 07B adds ReplayMarketDataProvider and FcsMarketDataProvider.
 * Payout adapters land in Prompt 08; Email/KYC adapters land later.
 */

export const PACKAGE_NAME = '@wariba/adapters';

export { SandboxPaymentProvider, type PaymentProvider } from './payment-provider';
export {
  MockPayoutProvider,
  ManualPayoutProvider,
  PAYOUT_PROVIDER_NAMES,
  PAYOUT_PROVIDER_STATUSES,
  type PayoutProvider,
  type PayoutProviderName,
  type PayoutProviderStatus,
  type PayoutProviderReference,
  type PayoutProviderFailure,
  type PayoutProviderSubmission,
  type PayoutProviderSubmissionResult,
  type PayoutProviderStatusResult,
  type PayoutProviderReconciliationInput,
  type PayoutProviderReconciliationResult,
} from './payout-provider';
export {
  MockMarketDataProvider,
  SANDBOX_BASE_PRICES,
  type MarketDataProvider,
  type MarketTick,
  type MarketStatus,
  type TradableSymbol,
  type SymbolSimConfig,
  type MarketDataMode,
  type MarketDataCapabilities,
  type MarketDataSourceIdentity,
} from './market-data-provider';
export {
  ReplayMarketDataProvider,
  type RecordedTick,
  type MarketDataRecording,
} from './replay-market-data-provider';
export {
  FcsMarketDataProvider,
  MarketDataProviderBlockedError,
  parseFcsMessage,
  type MarketDataBlockReason,
  type FcsProviderConfig,
  type FcsSymbolConfig,
  type WebSocketLike,
  type WebSocketFactory,
} from './fcs-market-data-provider';
export {
  HISTORICAL_BAR_ORIGINS,
  HISTORICAL_PROVIDER_ERROR_KINDS,
  HISTORICAL_VOLUME_SEMANTICS,
  HistoricalProviderError,
  derivedTimeframes,
  isRetryableProviderErrorKind,
  normalizeProviderBars,
  pageCoverageEnd,
  type HistoricalBar,
  type HistoricalBarOrigin,
  type HistoricalBarVolume,
  type HistoricalBarsPage,
  type HistoricalBarsRequest,
  type HistoricalMarketDataProvider,
  type HistoricalProviderErrorKind,
  type HistoricalVolumeSemantics,
  type RejectedHistoricalBar,
} from './historical-market-data-provider';
export {
  TWELVE_DATA_MAX_BARS_PER_REQUEST,
  TWELVE_DATA_NATIVE_TIMEFRAMES,
  TwelveDataHistoricalProvider,
  parseTwelveDataDatetime,
  parseTwelveDataSymbolMap,
  type TwelveDataProviderConfig,
  type TwelveDataSymbolConfig,
} from './twelve-data-historical-provider';
export {
  OANDA_MAX_BARS_PER_REQUEST,
  OANDA_NATIVE_TIMEFRAMES,
  OandaHistoricalProvider,
  assertOandaEnvironmentAllowed,
  parseOandaSymbolMap,
  type OandaEnvironment,
  type OandaProviderConfig,
  type OandaSymbolConfig,
} from './oanda-historical-provider';
