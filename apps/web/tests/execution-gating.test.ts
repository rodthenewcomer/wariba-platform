import { describe, expect, it } from 'vitest';
import type { AccountRisk, MarketTick } from '@wariba/contracts';
import {
  deriveExecutionGate,
  type ExecutionGateInput,
} from '../app/(trade)/trade/execution/execution-gating';

/**
 * W4 §6/§36/§37/§57 — the Execution Center's entry gate.
 *
 * Two properties matter more than any individual branch, and both are asserted
 * across the whole input space below rather than on one example:
 *
 * 1. **Risk reduction is never gated.** `reductionAvailable` is true in every
 *    state, including a hard breach. The gate is consumed only by the two entry
 *    actions; closing or reducing a position must stay reachable when a trader
 *    is losing money, which is exactly when they need it.
 * 2. **No limit is recomputed.** The gate reads `AccountRisk`'s own verdict
 *    fields (`status`, `softLockTriggered`, `shortDurationMonitoring.status`) —
 *    a snapshot that says "not breached" is never overridden by arithmetic on
 *    balance or equity performed here.
 *
 * The precedence order is asserted explicitly because it is a *product*
 * decision, not an implementation detail: a disconnected socket must not be
 * reported as "quantité invalide", and a hard breach must not be reported as a
 * stale price.
 */

const OPEN_TICK: MarketTick = {
  symbol: 'EURUSD',
  bid: '1.08500',
  ask: '1.08510',
  timestamp: '2026-01-01T00:00:00.000Z',
  marketStatus: 'open',
} as MarketTick;

function riskWith(overrides: Partial<AccountRisk> = {}): AccountRisk {
  return {
    status: 'active',
    programEligibleBalance: '10000.00',
    programEligibleEquity: '10000.00',
    target: { required: '1000.00', current: '0.00', reached: false },
    dailyLoss: {
      reference: '10000.00',
      floor: '9500.00',
      used: '0.00',
      remaining: '500.00',
      softLockTriggered: false,
    },
    maximumLoss: { floor: '9000.00', remaining: '1000.00', breached: false },
    bestDay: { ratio: null, compliant: true },
    eligibility: { passEligible: true, blockingReasons: [] },
    concentration: [],
    shortDurationMonitoring: { status: 'normal', count24h: 0 },
    ...overrides,
  } as AccountRisk;
}

function gateWith(overrides: Partial<ExecutionGateInput> = {}) {
  return deriveExecutionGate({
    connectionOk: true,
    isResyncing: false,
    tick: OPEN_TICK,
    risk: riskWith(),
    quantityError: null,
    triggerPriceError: null,
    protectionError: null,
    ...overrides,
  });
}

describe('deriveExecutionGate', () => {
  it('allows entry when the socket is open, the market is open and every field parses', () => {
    const gate = gateWith();
    expect(gate.entryBlocked).toBe(false);
    expect(gate.reason).toBeNull();
    expect(gate.message).toBeNull();
  });

  it('blocks on each connection and market state with its own reason', () => {
    expect(gateWith({ isResyncing: true }).reason).toBe('resyncing');
    expect(gateWith({ connectionOk: false }).reason).toBe('disconnected');
    expect(gateWith({ tick: null }).reason).toBe('quote_unavailable');
    expect(gateWith({ tick: { ...OPEN_TICK, marketStatus: 'stale' } }).reason).toBe('market_stale');
    expect(gateWith({ tick: { ...OPEN_TICK, marketStatus: 'closed' } }).reason).toBe(
      'market_closed',
    );
  });

  it('blocks on each risk verdict the server already published', () => {
    expect(gateWith({ risk: riskWith({ status: 'breached' }) }).reason).toBe('risk_hard_breach');
    expect(gateWith({ risk: riskWith({ status: 'soft_locked' }) }).reason).toBe('risk_soft_lock');
    expect(
      gateWith({
        risk: riskWith({
          dailyLoss: { ...riskWith().dailyLoss, softLockTriggered: true },
        }),
      }).reason,
    ).toBe('risk_soft_lock');
    expect(
      gateWith({
        risk: riskWith({ shortDurationMonitoring: { status: 'entry_locked', count24h: 6 } }),
      }).reason,
    ).toBe('short_duration_entry_locked');
  });

  it('does not invent a limit the risk snapshot did not report', () => {
    // A snapshot that says the account is active, with the daily-loss budget
    // fully consumed but no soft lock triggered, must not be blocked here: the
    // server owns that verdict, and re-deriving one from `used` vs `floor`
    // would be a second risk engine in the browser.
    const spent = riskWith({
      dailyLoss: {
        reference: '10000.00',
        floor: '9500.00',
        used: '500.00',
        remaining: '0.00',
        softLockTriggered: false,
      },
    });
    expect(gateWith({ risk: spent }).entryBlocked).toBe(false);
  });

  it('treats a missing risk snapshot as no risk verdict rather than as a block', () => {
    expect(gateWith({ risk: null }).entryBlocked).toBe(false);
  });

  it('blocks on each field error and shows the field’s own message, not a generic one', () => {
    const quantity = gateWith({ quantityError: 'Doit être entre 0.01 et 10.00.' });
    expect(quantity.reason).toBe('invalid_quantity');
    expect(quantity.message).toBe('Doit être entre 0.01 et 10.00.');

    const trigger = gateWith({ triggerPriceError: 'Requis pour un ordre en attente.' });
    expect(trigger.reason).toBe('invalid_trigger_price');
    expect(trigger.message).toBe('Requis pour un ordre en attente.');

    const protection = gateWith({ protectionError: 'Doit être un nombre décimal valide.' });
    expect(protection.reason).toBe('invalid_protection');
    expect(protection.message).toBe('Doit être un nombre décimal valide.');
  });

  it('reports the connection before the market, the market before risk, and risk before fields', () => {
    // All four conditions true at once: the trader must be told the most
    // fundamental one, because fixing the quantity would change nothing.
    const everythingWrong: Partial<ExecutionGateInput> = {
      connectionOk: false,
      tick: { ...OPEN_TICK, marketStatus: 'closed' },
      risk: riskWith({ status: 'breached' }),
      quantityError: 'Quantité invalide.',
    };
    expect(gateWith(everythingWrong).reason).toBe('disconnected');
    expect(gateWith({ ...everythingWrong, connectionOk: true }).reason).toBe('market_closed');
    expect(gateWith({ ...everythingWrong, connectionOk: true, tick: OPEN_TICK }).reason).toBe(
      'risk_hard_breach',
    );
    expect(
      gateWith({
        ...everythingWrong,
        connectionOk: true,
        tick: OPEN_TICK,
        risk: riskWith(),
      }).reason,
    ).toBe('invalid_quantity');
  });

  it('reports resynchronisation ahead of a dropped connection — the more specific of the two', () => {
    expect(gateWith({ isResyncing: true, connectionOk: false }).reason).toBe('resyncing');
  });

  it('always carries a message when it blocks, and never when it does not', () => {
    const inputs: Partial<ExecutionGateInput>[] = [
      {},
      { isResyncing: true },
      { connectionOk: false },
      { tick: null },
      { tick: { ...OPEN_TICK, marketStatus: 'stale' } },
      { tick: { ...OPEN_TICK, marketStatus: 'closed' } },
      { risk: riskWith({ status: 'breached' }) },
      { risk: riskWith({ status: 'soft_locked' }) },
      { risk: riskWith({ shortDurationMonitoring: { status: 'entry_locked', count24h: 6 } }) },
      { quantityError: 'x' },
      { triggerPriceError: 'y' },
      { protectionError: 'z' },
    ];
    for (const input of inputs) {
      const gate = gateWith(input);
      expect(gate.message === null).toBe(!gate.entryBlocked);
      if (gate.entryBlocked) expect(gate.message).not.toBe('');
    }
  });

  it('never gates risk reduction, in any state — including a hard breach', () => {
    const inputs: Partial<ExecutionGateInput>[] = [
      {},
      { connectionOk: false, isResyncing: true, tick: null },
      { risk: riskWith({ status: 'breached' }) },
      { risk: riskWith({ status: 'soft_locked' }) },
      { risk: riskWith({ shortDurationMonitoring: { status: 'entry_locked', count24h: 9 } }) },
      { quantityError: 'x', triggerPriceError: 'y', protectionError: 'z' },
    ];
    for (const input of inputs) {
      expect(gateWith(input).reductionAvailable).toBe(true);
    }
  });
});
