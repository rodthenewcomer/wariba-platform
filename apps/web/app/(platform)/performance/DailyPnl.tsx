'use client';

import type { BalancePoint, DailyResult } from '@wariba/application';
import { BarSeries } from '../../../components/hub/charts/BarSeries';
import { EquityCurve } from '../../../components/hub/charts/EquityCurve';

/**
 * Two readings of the same period.
 *
 * The curve says where the account got to; the bars say how each day
 * contributed. Traders read them differently — a smooth curve made of one
 * enormous day and nine flat ones is a consistency problem the curve alone
 * hides, and the bars make it obvious at a glance.
 */
export function DailyPnl({
  daily,
  variant,
  balance,
}: {
  daily: readonly DailyResult[];
  variant: 'bars' | 'balance';
  balance?: readonly BalancePoint[];
}) {
  if (variant === 'balance') {
    return (
      <EquityCurve
        points={(balance ?? []).map((point) => ({ time: point.time, value: point.balance }))}
        height={240}
      />
    );
  }

  if (daily.length === 0) {
    return (
      <p className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
        Aucune journée clôturée sur cette période.
      </p>
    );
  }

  const total = daily.reduce((sum, day) => sum + Number.parseFloat(day.netPnl), 0);

  return (
    <BarSeries
      height={180}
      data={daily.map((day) => ({
        // `12/08` — a date axis on a phone has room for four characters.
        label: day.date.slice(8, 10) + '/' + day.date.slice(5, 7),
        value: Number.parseFloat(day.netPnl),
      }))}
      format={(value) =>
        `${value > 0 ? '+' : ''}${value.toLocaleString('fr-FR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} USD`
      }
      ariaSummary={`Résultat par journée sur ${daily.length} journée${
        daily.length > 1 ? 's' : ''
      }, pour un total de ${total.toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} USD.`}
    />
  );
}
