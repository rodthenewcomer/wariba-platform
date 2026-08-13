'use client';

import { Anchor, Dot, HAIR, createChartingIcon } from './factory';

/**
 * Projection, volume-based and measurer families.
 *
 * Long and Short Position take the reference's slider silhouette rather than a
 * box-and-arrow, because that is what the family reads as on a rail — but the
 * knobs ascend for long and descend for short, so the two are distinguishable at
 * 18px, which the reference's own pair is not.
 */

function sliders(knobs: readonly number[]) {
  const rows = [7, 12, 17];
  return (
    <>
      {rows.map((y) => (
        <path key={y} d={`M4 ${y}h16`} strokeWidth={HAIR} />
      ))}
      {rows.map((y, index) => (
        <Dot key={y} cx={knobs[index] ?? 12} cy={y} r={1.9} />
      ))}
    </>
  );
}

export const WariXLongPositionIcon = createChartingIcon(sliders([16.5, 12, 7.5]));
export const WariXShortPositionIcon = createChartingIcon(sliders([7.5, 12, 16.5]));

export const WariXForecastIcon = createChartingIcon(
  <>
    <path d="M6.5 18.5V9M12 20V6M17.5 16.5V4.5" strokeWidth={HAIR} />
    <Dot cx={6.5} cy={13.6} r={1.7} />
    <Dot cx={12} cy={11.2} r={1.7} />
    <Dot cx={17.5} cy={8.8} r={1.7} />
  </>,
);

/** Bars pattern — OHLC bars with their open and close ticks. */
export const WariXBarsPatternIcon = createChartingIcon(
  <>
    <path d="M6.5 6.5v11M12 4.5v15M17.5 8.5v9" />
    <path
      d="M4.4 9.4h2.1M6.5 13.2h2.1M9.9 8h2.1M12 15.4h2.1M15.4 11.4h2.1M17.5 15h2.1"
      strokeWidth={HAIR}
    />
  </>,
);

/** Ghost feed — the same bars, drawn as a projection rather than as observed data. */
export const WariXGhostFeedIcon = createChartingIcon(
  <>
    <path d="M6.5 6.5v11M12 4.5v15M17.5 8.5v9" strokeDasharray="2.2 2.2" />
    <path
      d="M4.4 9.4h2.1M6.5 13.2h2.1M9.9 8h2.1M12 15.4h2.1M15.4 11.4h2.1M17.5 15h2.1"
      strokeWidth={HAIR}
      strokeDasharray="2.2 2.2"
    />
  </>,
);

export const WariXProjectionIcon = createChartingIcon(
  <>
    <path d="M5.4 4.8v14.4h14.4" strokeWidth={HAIR} />
    <path d="M5.4 17C10.6 17 13.6 13.4 15.2 6.4" />
    <Anchor cx={5.4} cy={19.2} />
  </>,
);

export const WariXAnchoredVwapIcon = createChartingIcon(
  <>
    <path d="M5.4 16.4C9 16.4 10 8.6 13.4 8.6c2.4 0 3.6 3 6.6 3" />
    <Dot cx={5.4} cy={16.4} r={2} />
    <path d="M5.4 16.4v3.8" strokeWidth={HAIR} />
  </>,
);

export const WariXVolumeProfileIcon = createChartingIcon(
  <>
    <path d="M5.6 4.6v14.8" />
    <path d="M5.6 7.6h8.2M5.6 11.2h12.6M5.6 14.8h6.2M5.6 18.4h9.8" strokeWidth={HAIR} />
  </>,
);

export const WariXPriceRangeIcon = createChartingIcon(
  <>
    <path d="M6.4 5.6h11.2M6.4 18.4h11.2" strokeWidth={HAIR} />
    <path d="M12 7.4v9.2" />
    <path d="M9.8 9.6L12 7.2l2.2 2.4M9.8 14.4L12 16.8l2.2-2.4" />
  </>,
);

export const WariXDateRangeIcon = createChartingIcon(
  <>
    <path d="M5.6 6.4v11.2M18.4 6.4v11.2" strokeWidth={HAIR} />
    <path d="M7.4 12h9.2" />
    <path d="M9.6 9.8L7.2 12l2.4 2.2M14.4 9.8L16.8 12l-2.4 2.2" />
  </>,
);

export const WariXDatePriceRangeIcon = createChartingIcon(
  <>
    <rect x="4.6" y="5.6" width="14.8" height="12.8" rx="1.2" strokeWidth={HAIR} />
    <path d="M7.6 12h8.8M12 8.4v7.2" />
    <path d="M9.4 10.2L7.4 12l2 1.8M14.6 10.2L16.6 12l-2 1.8" strokeWidth={HAIR} />
  </>,
);
