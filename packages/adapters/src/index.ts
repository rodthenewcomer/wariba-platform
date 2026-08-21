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
