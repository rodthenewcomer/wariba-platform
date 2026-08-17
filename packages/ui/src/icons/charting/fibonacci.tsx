'use client';

import { Dot, HAIR, createChartingIcon } from './factory';

/**
 * Fibonacci and Gann.
 *
 * The family reads by *construction*: retracement is levels across a move,
 * channel is levels along it, time zone is levels in time, and the fan/arc/circle
 * trio are the same levels swept around a pivot. The pivot dot is what marks the
 * swept ones, so a fan is never mistaken for a channel at rail size.
 */

export const WariXFibRetracementIcon = createChartingIcon(
  <>
    <path d="M4 6.4h16M4 10.4h16M4 14.4h16M4 18.4h16" />
    <path d="M4 18.4L20 6.4" strokeWidth={HAIR} />
  </>,
);

export const WariXFibExtensionIcon = createChartingIcon(
  <>
    <path d="M3.6 18.4L8.4 8.2 13.2 14.6" />
    <path d="M12.4 4.6h8M12.4 8.2h8M12.4 11.8h8" strokeWidth={HAIR} />
  </>,
);

export const WariXFibChannelIcon = createChartingIcon(
  <>
    <path d="M3.6 20.4L20.4 11.6" />
    <path d="M3.6 16.4L20.4 7.6" />
    <path d="M3.6 12.4L20.4 3.6" strokeWidth={HAIR} />
  </>,
);

export const WariXFibTimeZoneIcon = createChartingIcon(
  <>
    <path d="M4.4 4.8v14.4M7.4 4.8v14.4M12 4.8v14.4M19 4.8v14.4" />
    <Dot cx={4.4} cy={19.2} r={1.4} />
  </>,
);

export const WariXFibSpeedFanIcon = createChartingIcon(
  <>
    <rect x="4.4" y="4.4" width="15.2" height="15.2" rx="1" strokeWidth={HAIR} />
    <path d="M4.4 19.6L19.6 4.4M4.4 19.6L19.6 10.6M4.4 19.6L13 4.4" />
    <Dot cx={4.4} cy={19.6} r={1.5} />
  </>,
);

export const WariXFibTimeIcon = createChartingIcon(
  <>
    <path d="M7 4.8v14.4M11 4.8v14.4M16 4.8v14.4M20 4.8v14.4" strokeWidth={HAIR} />
    <path d="M3.6 18.2L8.4 8.6 13.2 14.4" />
  </>,
);

export const WariXFibCirclesIcon = createChartingIcon(
  <>
    <circle cx="12" cy="12" r="3.3" strokeWidth={HAIR} />
    <circle cx="12" cy="12" r="6" strokeWidth={HAIR} />
    <circle cx="12" cy="12" r="8.6" />
    <Dot cx={12} cy={12} r={1.2} />
  </>,
);

export const WariXFibSpiralIcon = createChartingIcon(
  <path d="M12.6 12.6a1.1 1.1 0 0 1 0-1.6 2.3 2.3 0 0 1 3.2 3.2 4 4 0 0 1-5.6-5.6 6.4 6.4 0 0 1 9 9 9.4 9.4 0 0 1-13.3-13.3" />,
);

export const WariXFibArcsIcon = createChartingIcon(
  <>
    <path d="M4.6 13.6a6 6 0 0 1 6 6" strokeWidth={HAIR} />
    <path d="M4.6 9.8a9.8 9.8 0 0 1 9.8 9.8" strokeWidth={HAIR} />
    <path d="M4.6 6a13.6 13.6 0 0 1 13.6 13.6" />
    <Dot cx={4.6} cy={19.6} r={1.5} />
  </>,
);

export const WariXFibWedgeIcon = createChartingIcon(
  <>
    <path d="M4.6 19.6L20 6.6M4.6 19.6L20 15.4" />
    <path d="M11.6 18.2a8 8 0 0 0-3.4-5.6" strokeWidth={HAIR} />
    <path d="M17 16.8a13.4 13.4 0 0 0-6-9.4" strokeWidth={HAIR} />
    <Dot cx={4.6} cy={19.6} r={1.5} />
  </>,
);

export const WariXPitchfanIcon = createChartingIcon(
  <>
    <path d="M4.6 19.6L19.6 4.6M4.6 19.6L19.6 8.6M4.6 19.6L19.6 13M4.6 19.6L14.6 4.6M4.6 19.6L9.6 4.6" />
    <Dot cx={4.6} cy={19.6} r={1.5} />
  </>,
);

export const WariXGannBoxIcon = createChartingIcon(
  <>
    <rect x="4" y="5" width="16" height="14" rx="0.8" />
    <path d="M9.4 5v14M14.6 5v14M4 9.6h16M4 14.4h16" strokeWidth={HAIR} />
  </>,
);

export const WariXGannSquareFixedIcon = createChartingIcon(
  <>
    <rect x="5" y="5" width="14" height="14" rx="0.8" />
    <path d="M9.6 5v14M14.4 5v14M5 9.6h14M5 14.4h14" strokeWidth={HAIR} />
    <path d="M5 19L19 5" />
  </>,
);

export const WariXGannSquareIcon = createChartingIcon(
  <>
    <rect x="5" y="5" width="14" height="14" rx="0.8" />
    <path d="M9.6 5v14M14.4 5v14M5 9.6h14M5 14.4h14" strokeWidth={HAIR} />
    <path d="M5 19L19 5M5 5l14 14" />
  </>,
);

export const WariXGannFanIcon = createChartingIcon(
  <>
    <rect x="4.4" y="4.4" width="15.2" height="15.2" rx="0.8" strokeWidth={HAIR} />
    <path d="M4.4 19.6L19.6 4.4M4.4 19.6L19.6 12M4.4 19.6L12 4.4" />
  </>,
);
