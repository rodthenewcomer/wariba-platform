/**
 * @wariba/adapters — Provider port interfaces (market data, payment, payout, email, storage, KYC, feature flags) with sandbox implementations.
 *
 * Prompt 03 adds the PaymentProvider port and SandboxPaymentProvider.
 * Prompt 04 adds the MarketDataProvider port and SandboxMarketDataProvider.
 * Payout/Email/KYC adapters land in later prompts.
 */

export const PACKAGE_NAME = '@wariba/adapters';

export { SandboxPaymentProvider, type PaymentProvider } from './payment-provider';
export {
  SandboxMarketDataProvider,
  SANDBOX_BASE_PRICES,
  type MarketDataProvider,
  type MarketTick,
  type MarketStatus,
  type TradableSymbol,
  type SymbolSimConfig,
} from './market-data-provider';
