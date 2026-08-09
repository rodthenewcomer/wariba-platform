import { describe, expect, it } from 'vitest';
import {
  computeReserveCoverageRatio,
  resolveReserveZone,
  isSizeCommerciallyAvailableInZone,
} from '../src/treasury-math';

describe('computeReserveCoverageRatio — TREASURY-002', () => {
  it('is null when nothing is projected — not zero, not infinite', () => {
    expect(
      computeReserveCoverageRatio({ availableReserve: '100000', projectedPayoutsNext30Days: '0' }),
    ).toBeNull();
  });

  it('divides reserve by projected payouts', () => {
    expect(
      computeReserveCoverageRatio({
        availableReserve: '30000',
        projectedPayoutsNext30Days: '10000',
      }),
    ).toBe('3.0000');
  });
});

describe('resolveReserveZone — TREASURY-002', () => {
  it('is NORMAL with no projected payouts at all', () => {
    expect(resolveReserveZone(null)).toBe('normal');
  });

  it('is NORMAL at and above 2.0x', () => {
    expect(resolveReserveZone('2.0000')).toBe('normal');
    expect(resolveReserveZone('5.0000')).toBe('normal');
  });

  it('is PRUDENCE between 1.5x and 2.0x', () => {
    expect(resolveReserveZone('1.9999')).toBe('prudence');
    expect(resolveReserveZone('1.5000')).toBe('prudence');
  });

  it('is DEFENSIVE between 1.2x and 1.5x', () => {
    expect(resolveReserveZone('1.4999')).toBe('defensive');
    expect(resolveReserveZone('1.2000')).toBe('defensive');
  });

  it('is CRITICAL below 1.2x', () => {
    expect(resolveReserveZone('1.1999')).toBe('critical');
    expect(resolveReserveZone('0.0000')).toBe('critical');
  });
});

describe('isSizeCommerciallyAvailableInZone — TREASURY-002', () => {
  it('every size is available in NORMAL and PRUDENCE', () => {
    for (const zone of ['normal', 'prudence'] as const) {
      for (const productCode of ['5K', '10K', '25K', '50K', '100K'] as const) {
        expect(isSizeCommerciallyAvailableInZone({ zone, productCode })).toBe(true);
      }
    }
  });

  it('DEFENSIVE disables only 50K and 100K', () => {
    expect(isSizeCommerciallyAvailableInZone({ zone: 'defensive', productCode: '5K' })).toBe(true);
    expect(isSizeCommerciallyAvailableInZone({ zone: 'defensive', productCode: '10K' })).toBe(true);
    expect(isSizeCommerciallyAvailableInZone({ zone: 'defensive', productCode: '25K' })).toBe(true);
    expect(isSizeCommerciallyAvailableInZone({ zone: 'defensive', productCode: '50K' })).toBe(
      false,
    );
    expect(isSizeCommerciallyAvailableInZone({ zone: 'defensive', productCode: '100K' })).toBe(
      false,
    );
  });

  it('CRITICAL disables every size', () => {
    for (const productCode of ['5K', '10K', '25K', '50K', '100K'] as const) {
      expect(isSizeCommerciallyAvailableInZone({ zone: 'critical', productCode })).toBe(false);
    }
  });
});
