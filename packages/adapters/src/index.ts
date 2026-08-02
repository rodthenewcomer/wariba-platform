/**
 * @wariba/adapters — Provider port interfaces (market data, payment, payout, email, storage, KYC, feature flags) with sandbox implementations.
 *
 * Prompt 03 adds the PaymentProvider port and SandboxPaymentProvider.
 * MarketData/Payout/Email/KYC adapters land in later prompts.
 */

export const PACKAGE_NAME = '@wariba/adapters';

export { SandboxPaymentProvider, type PaymentProvider } from './payment-provider';
