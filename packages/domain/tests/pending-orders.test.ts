import { describe, expect, it } from 'vitest';
import {
  pendingOrderSide,
  isPendingOrderCreationPriceValid,
  isPendingOrderTriggered,
  clampPendingOrderFillPrice,
  pendingOrderDistancePoints,
} from '../src/pending-orders';

const MARKET = { currentBid: '1.08450', currentAsk: '1.08460' };

describe('pendingOrderSide', () => {
  it('buy_limit and buy_stop are buy; sell_limit and sell_stop are sell', () => {
    expect(pendingOrderSide('buy_limit')).toBe('buy');
    expect(pendingOrderSide('buy_stop')).toBe('buy');
    expect(pendingOrderSide('sell_limit')).toBe('sell');
    expect(pendingOrderSide('sell_stop')).toBe('sell');
  });
});

describe('isPendingOrderCreationPriceValid', () => {
  it('buy_limit requires a trigger price below the current ask', () => {
    expect(
      isPendingOrderCreationPriceValid({
        orderType: 'buy_limit',
        triggerPrice: '1.08000',
        ...MARKET,
      }),
    ).toBe(true);
    expect(
      isPendingOrderCreationPriceValid({
        orderType: 'buy_limit',
        triggerPrice: '1.08460',
        ...MARKET,
      }),
    ).toBe(false);
    expect(
      isPendingOrderCreationPriceValid({
        orderType: 'buy_limit',
        triggerPrice: '1.09000',
        ...MARKET,
      }),
    ).toBe(false);
  });

  it('sell_limit requires a trigger price above the current bid', () => {
    expect(
      isPendingOrderCreationPriceValid({
        orderType: 'sell_limit',
        triggerPrice: '1.09000',
        ...MARKET,
      }),
    ).toBe(true);
    expect(
      isPendingOrderCreationPriceValid({
        orderType: 'sell_limit',
        triggerPrice: '1.08000',
        ...MARKET,
      }),
    ).toBe(false);
  });

  it('buy_stop requires a trigger price above the current ask', () => {
    expect(
      isPendingOrderCreationPriceValid({
        orderType: 'buy_stop',
        triggerPrice: '1.09000',
        ...MARKET,
      }),
    ).toBe(true);
    expect(
      isPendingOrderCreationPriceValid({
        orderType: 'buy_stop',
        triggerPrice: '1.08000',
        ...MARKET,
      }),
    ).toBe(false);
  });

  it('sell_stop requires a trigger price below the current bid', () => {
    expect(
      isPendingOrderCreationPriceValid({
        orderType: 'sell_stop',
        triggerPrice: '1.08000',
        ...MARKET,
      }),
    ).toBe(true);
    expect(
      isPendingOrderCreationPriceValid({
        orderType: 'sell_stop',
        triggerPrice: '1.09000',
        ...MARKET,
      }),
    ).toBe(false);
  });
});

describe('isPendingOrderTriggered', () => {
  it('buy_limit triggers when the ask falls to or below the limit', () => {
    expect(
      isPendingOrderTriggered({ orderType: 'buy_limit', triggerPrice: '1.08460', ...MARKET }),
    ).toBe(true);
    expect(
      isPendingOrderTriggered({ orderType: 'buy_limit', triggerPrice: '1.08000', ...MARKET }),
    ).toBe(false);
  });

  it('sell_limit triggers when the bid rises to or above the limit', () => {
    expect(
      isPendingOrderTriggered({ orderType: 'sell_limit', triggerPrice: '1.08450', ...MARKET }),
    ).toBe(true);
    expect(
      isPendingOrderTriggered({ orderType: 'sell_limit', triggerPrice: '1.09000', ...MARKET }),
    ).toBe(false);
  });

  it('buy_stop triggers when the ask rises to or above the stop', () => {
    expect(
      isPendingOrderTriggered({ orderType: 'buy_stop', triggerPrice: '1.08460', ...MARKET }),
    ).toBe(true);
    expect(
      isPendingOrderTriggered({ orderType: 'buy_stop', triggerPrice: '1.09000', ...MARKET }),
    ).toBe(false);
  });

  it('sell_stop triggers when the bid falls to or below the stop', () => {
    expect(
      isPendingOrderTriggered({ orderType: 'sell_stop', triggerPrice: '1.08450', ...MARKET }),
    ).toBe(true);
    expect(
      isPendingOrderTriggered({ orderType: 'sell_stop', triggerPrice: '1.08000', ...MARKET }),
    ).toBe(false);
  });
});

describe('clampPendingOrderFillPrice', () => {
  it('a buy_limit fill is clamped down to the limit price if slippage would push it above', () => {
    expect(
      clampPendingOrderFillPrice({
        orderType: 'buy_limit',
        fillPrice: '1.08465',
        triggerPrice: '1.08460',
        pricePrecision: 5,
      }),
    ).toBe('1.08460');
  });

  it('a buy_limit fill already at or below the limit is left untouched', () => {
    expect(
      clampPendingOrderFillPrice({
        orderType: 'buy_limit',
        fillPrice: '1.08440',
        triggerPrice: '1.08460',
        pricePrecision: 5,
      }),
    ).toBe('1.08440');
  });

  it('a sell_limit fill is clamped up to the limit price if slippage would push it below', () => {
    expect(
      clampPendingOrderFillPrice({
        orderType: 'sell_limit',
        fillPrice: '1.08445',
        triggerPrice: '1.08450',
        pricePrecision: 5,
      }),
    ).toBe('1.08450');
  });

  it('stop orders are never clamped — gap slippage past the stop price is documented, intended behavior', () => {
    expect(
      clampPendingOrderFillPrice({
        orderType: 'buy_stop',
        fillPrice: '1.09500',
        triggerPrice: '1.09000',
        pricePrecision: 5,
      }),
    ).toBe('1.09500');
    expect(
      clampPendingOrderFillPrice({
        orderType: 'sell_stop',
        fillPrice: '1.07000',
        triggerPrice: '1.07500',
        pricePrecision: 5,
      }),
    ).toBe('1.07000');
  });
});

describe('pendingOrderDistancePoints', () => {
  it('computes an unsigned distance in points', () => {
    expect(
      pendingOrderDistancePoints({
        triggerPrice: '1.08240',
        referencePrice: '1.08460',
        pricePrecision: 5,
      }),
    ).toBe('220.0');
  });
});
