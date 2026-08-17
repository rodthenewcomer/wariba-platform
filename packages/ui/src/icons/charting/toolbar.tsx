'use client';

import { Dot, HAIR, createChartingIcon } from './factory';

/**
 * Chart toolbar and utility glyphs.
 *
 * These are the controls that sit *around* the plot rather than draw on it —
 * candles, indicators, preferences, undo, snapshot, fullscreen. They are drawn
 * here rather than wrapped from the general icon library for the same reason as
 * the tools: `f(x)` is what a trader looks for to add a study, and a slider
 * glyph is what they look for to change settings. Swapping the two, which the
 * previous toolbar did, costs a scan every time.
 */

/** Candlestick series — the chart-type control's identity. */
export const WariXCandlesIcon = createChartingIcon(
  <>
    <path d="M7.6 3.6v3.2M7.6 17.2v3.2M16.4 5.4v2.8M16.4 15.8v2.8" strokeWidth={HAIR} />
    <rect x="5.2" y="6.8" width="4.8" height="10.4" rx="0.9" />
    <rect x="14" y="8.2" width="4.8" height="7.6" rx="0.9" />
  </>,
);

/** Indicators — the `f(x)` a trader looks for. */
export const WariXStudiesIcon = createChartingIcon(
  <>
    <path d="M4.4 19.6c1.8 0 2.2-1.4 2.8-5.4C7.8 10 8.2 4.4 10.8 4.4c1.2 0 1.8 0.8 1.8 0.8" />
    <path d="M4.8 11.6h6.4" strokeWidth={HAIR} />
    <path d="M14.4 10.4l5.2 8M19.6 10.4l-5.2 8" />
  </>,
);

/** Preferences — a settings gear, the reference's own affordance. */
export const WariXPreferencesIcon = createChartingIcon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.2v2.4M12 18.4v2.4M20.8 12h-2.4M5.6 12H3.2M18.2 5.8l-1.7 1.7M7.5 16.5l-1.7 1.7M18.2 18.2l-1.7-1.7M7.5 7.5L5.8 5.8" />
  </>,
);

export const WariXUndoIcon = createChartingIcon(
  <>
    <path d="M4.4 9.6h9.2a5.6 5.6 0 0 1 0 11.2H8.4" />
    <path d="M8 5.2L3.6 9.6 8 14" />
  </>,
);

export const WariXRedoIcon = createChartingIcon(
  <>
    <path d="M19.6 9.6h-9.2a5.6 5.6 0 0 0 0 11.2h5.2" />
    <path d="M16 5.2L20.4 9.6 16 14" />
  </>,
);

/** Snapshot. */
export const WariXCameraIcon = createChartingIcon(
  <>
    <path d="M3.4 8.6a1.8 1.8 0 0 1 1.8-1.8h2.6l1.4-2.2h4.6l1.4 2.2h2.6a1.8 1.8 0 0 1 1.8 1.8v9a1.8 1.8 0 0 1-1.8 1.8H5.2a1.8 1.8 0 0 1-1.8-1.8Z" />
    <circle cx="12" cy="12.6" r="3.4" strokeWidth={HAIR} />
  </>,
);

export const WariXFullscreenIcon = createChartingIcon(
  <path d="M4 9V4.4h4.6M15.4 4.4H20V9M20 15v4.6h-4.6M8.6 19.6H4V15" />,
);

export const WariXFullscreenExitIcon = createChartingIcon(
  <path d="M8.6 4v4.6H4M20 8.6h-4.6V4M15.4 20v-4.6H20M4 15.4h4.6V20" />,
);

/** Fit / reset the visible range. */
export const WariXFitContentIcon = createChartingIcon(
  <>
    <path d="M3.6 6.4V4.4h2.6M17.8 4.4h2.6v2M20.4 17.6v2h-2.6M6.2 19.6H3.6v-2" />
    <path d="M7.4 14.6l3.2-4.4 2.8 3 3.2-4.6" />
  </>,
);

/** Object tree. */
export const WariXObjectTreeIcon = createChartingIcon(
  <>
    <path d="M4.4 6.2h15.2M8.4 12h11.2M8.4 17.8h11.2" />
    <Dot cx={5.4} cy={12} r={1.2} />
    <Dot cx={5.4} cy={17.8} r={1.2} />
  </>,
);

/** Copy — the context menu's Copy price. */
export const WariXCopyIcon = createChartingIcon(
  <>
    <rect x="8.4" y="8.4" width="11.2" height="11.2" rx="1.8" />
    <path d="M15.6 8.4V6.2a1.8 1.8 0 0 0-1.8-1.8H6.2a1.8 1.8 0 0 0-1.8 1.8v7.6a1.8 1.8 0 0 0 1.8 1.8h2.2" />
  </>,
);

/** Price alert. */
export const WariXAlertClockIcon = createChartingIcon(
  <>
    <circle cx="12" cy="12" r="8.2" />
    <path d="M12 7.4V12l3.2 1.9" strokeWidth={HAIR} />
  </>,
);

/** Buy / sell direction marks for the context menu's trading group. */
export const WariXBuyIcon = createChartingIcon(
  <>
    <path d="M12 19.4V5.2" />
    <path d="M6.6 10.6L12 5.2l5.4 5.4" />
  </>,
);

export const WariXSellIcon = createChartingIcon(
  <>
    <path d="M12 4.6v14.2" />
    <path d="M6.6 13.4L12 18.8l5.4-5.4" />
  </>,
);

/** Watermark toggle. */
export const WariXWatermarkIcon = createChartingIcon(
  <>
    <rect x="3.6" y="5.4" width="16.8" height="13.2" rx="1.6" strokeWidth={HAIR} />
    <path d="M7.4 15.2l2.8-6.4 2.8 6.4M8.4 13.2h3.6" strokeWidth={HAIR} />
    <path d="M14.6 15.2V8.8l2.6 6.4" strokeWidth={HAIR} />
  </>,
);
