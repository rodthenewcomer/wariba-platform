'use client';

import { Anchor, Dot, HAIR, createChartingIcon } from './factory';

/**
 * Cursors and rail utilities.
 *
 * The top of a charting rail is not a drawing family — it is the pointer's own
 * mode (what a click *does* when no tool is held) followed by the rail's
 * housekeeping controls. They share the file because they share that role.
 */

/** Cursor: cross. The default charting pointer — four arms with a centre gap. */
export const WariXCursorCrossIcon = createChartingIcon(
  <>
    <path d="M12 3.5V9.5M12 14.5V20.5M3.5 12H9.5M14.5 12H20.5" />
  </>,
);

/** Cursor: dot. */
export const WariXCursorDotIcon = createChartingIcon(<Dot cx={12} cy={12} r={3.2} />);

/** Cursor: arrow. */
export const WariXCursorArrowIcon = createChartingIcon(
  <path d="M5.6 3.4V17.9L9.5 14.2L11.9 19.5L14.4 18.4L12 13.3L17.3 13Z" />,
);

/** Demonstration / replay. */
export const WariXDemonstrationIcon = createChartingIcon(
  <>
    <circle cx="12" cy="12" r="8.2" />
    <path d="M10.3 8.7L16 12L10.3 15.3Z" />
  </>,
);

/** Eraser. */
export const WariXEraserIcon = createChartingIcon(
  <>
    <path d="M3.8 16.6L12 8.4a1.8 1.8 0 0 1 2.6 0l4.9 4.9a1.8 1.8 0 0 1 0 2.6l-3.9 3.9H7.1Z" />
    <path d="M8.4 12l7.5 7.5" strokeWidth={HAIR} />
  </>,
);

/** Measure / ruler. */
export const WariXRulerIcon = createChartingIcon(
  <g transform="rotate(-45 12 12)">
    <rect x="2.8" y="9.2" width="18.4" height="5.6" rx="1.2" />
    <path d="M7 9.2v2.4M10.6 9.2v3.2M14.2 9.2v2.4M17.8 9.2v3.2" strokeWidth={HAIR} />
  </g>,
);

/** Zoom. */
export const WariXZoomIcon = createChartingIcon(
  <>
    <circle cx="10.6" cy="10.6" r="6.3" />
    <path d="M15.3 15.3L20.2 20.2" />
    <path d="M10.6 7.9v5.4M7.9 10.6h5.4" strokeWidth={HAIR} />
  </>,
);

/** Magnet — snap drawings to OHLC. */
export const WariXMagnetIcon = createChartingIcon(
  <>
    <path d="M5.8 20V12a6.2 6.2 0 0 1 12.4 0v8" />
    <path d="M10 20v-8a2 2 0 0 1 4 0v8" />
    <path d="M5.8 16.6H10M14 16.6h4.2" strokeWidth={HAIR} />
  </>,
);

/** Lock drawings. */
export const WariXLockClosedIcon = createChartingIcon(
  <>
    <rect x="4.8" y="10.2" width="14.4" height="9.6" rx="2" />
    <path d="M8.4 10.2V7.6a3.6 3.6 0 0 1 7.2 0v2.6" />
  </>,
);

export const WariXLockOpenIcon = createChartingIcon(
  <>
    <rect x="4.8" y="10.2" width="14.4" height="9.6" rx="2" />
    <path d="M8.4 10.2V7.6a3.6 3.6 0 0 1 6.9-1.3" />
  </>,
);

/** Drawing-mode lock — the pencil the rail locks, not a generic padlock. */
export const WariXDrawingLockIcon = createChartingIcon(
  <>
    <path d="M3.6 20.4l1.1-3.9 8.7-8.7 2.8 2.8-8.7 8.7Z" />
    <path d="M14.3 6.6l1.5-1.5a1.5 1.5 0 0 1 2.1 0l0.7 0.7a1.5 1.5 0 0 1 0 2.1l-1.5 1.5" />
    <rect x="15.6" y="15.6" width="5.4" height="4.4" rx="1" strokeWidth={HAIR} />
    <path d="M17 15.6v-1.2a1.3 1.3 0 0 1 2.6 0v1.2" strokeWidth={HAIR} />
  </>,
);

/** Visibility. */
export const WariXEyeIcon = createChartingIcon(
  <>
    <path d="M2.6 12S6.2 5.8 12 5.8 21.4 12 21.4 12 17.8 18.2 12 18.2 2.6 12 2.6 12Z" />
    <circle cx="12" cy="12" r="2.7" strokeWidth={HAIR} />
  </>,
);

export const WariXEyeOffIcon = createChartingIcon(
  <>
    <path d="M4.4 8.2C3.2 9.6 2.6 12 2.6 12S6.2 18.2 12 18.2c1.7 0 3.2-.5 4.4-1.2" />
    <path d="M19 15.3c1.6-1.6 2.4-3.3 2.4-3.3S17.8 5.8 12 5.8c-1 0-2 .2-2.8.5" />
    <path d="M4 4l16 16" strokeWidth={HAIR} />
  </>,
);

/** Link / sync charts. */
export const WariXChartLinkIcon = createChartingIcon(
  <>
    <path d="M9.4 14.6a4.4 4.4 0 0 1 0-6.2l2.6-2.6a4.4 4.4 0 0 1 6.2 6.2l-1.3 1.3" />
    <path d="M14.6 9.4a4.4 4.4 0 0 1 0 6.2l-2.6 2.6a4.4 4.4 0 0 1-6.2-6.2l1.3-1.3" />
  </>,
);

/** Remove all. */
export const WariXTrashIcon = createChartingIcon(
  <>
    <path d="M3.8 6.8h16.4" />
    <path d="M9.4 6.8V4.6h5.2v2.2" />
    <path d="M6.2 6.8l0.9 12.5a1.6 1.6 0 0 0 1.6 1.5h6.6a1.6 1.6 0 0 0 1.6-1.5l0.9-12.5" />
    <path d="M10.3 10.4v6.6M13.7 10.4v6.6" strokeWidth={HAIR} />
  </>,
);

/** Favourites. */
export const WariXStarIcon = createChartingIcon(
  <path d="M12 3.6l2.6 5.6 6 0.8-4.4 4.3 1.1 6.1L12 17.5l-5.3 2.9 1.1-6.1L3.4 10l6-0.8Z" />,
);

/** Object tree / layers. */
export const WariXLayersIcon = createChartingIcon(
  <>
    <path d="M12 3.2L20.8 8 12 12.8 3.2 8Z" />
    <path d="M3.2 12L12 16.8 20.8 12" strokeWidth={HAIR} />
    <path d="M3.2 16L12 20.8 20.8 16" strokeWidth={HAIR} />
  </>,
);

/** Emoji / icons family. */
export const WariXEmojiIcon = createChartingIcon(
  <>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M8.4 14.4a4.4 4.4 0 0 0 7.2 0" strokeWidth={HAIR} />
    <Dot cx={9.4} cy={9.8} r={1} />
    <Dot cx={14.6} cy={9.8} r={1} />
  </>,
);

/** Anchor-dot marker used by the rail's "values tooltip" style toggles. */
export const WariXCrosshairPointIcon = createChartingIcon(
  <>
    <path d="M12 3.5V8M12 16V20.5M3.5 12H8M16 12H20.5" strokeWidth={HAIR} />
    <Anchor cx={12} cy={12} />
  </>,
);
