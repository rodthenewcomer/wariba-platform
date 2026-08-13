'use client';

import { Anchor, Dot, HAIR, createChartingIcon } from './factory';

/**
 * Lines, channels and pitchforks.
 *
 * The distinctions here are the ones traders actually make at a glance, and each
 * is carried by geometry rather than by a label:
 *
 * - **Where a line stops.** Trend line is anchored at both ends; ray is anchored
 *   at one and runs off the box; extended line runs off both and carries its
 *   anchors *inside*. That is the whole semantic difference between the three,
 *   and it is the only difference the glyphs show.
 * - **How many parallels.** Parallel channel is two, regression trend is three
 *   (the middle one lighter, because it is the regression itself), disjoint
 *   channel is two that do not share a slope.
 * - **Where the fork's handle starts.** All four pitchforks are one silhouette —
 *   median, crossbar, two prongs — differing only in the marked origin, which is
 *   exactly how the tools themselves differ.
 */

export const WariXTrendLineIcon = createChartingIcon(
  <>
    <path d="M7.2 16.8L16.8 7.2" />
    <Anchor cx={5.9} cy={18.1} />
    <Anchor cx={18.1} cy={5.9} />
  </>,
);

export const WariXRayIcon = createChartingIcon(
  <>
    <path d="M7.2 16.8L20.6 3.4" />
    <Anchor cx={5.9} cy={18.1} />
  </>,
);

export const WariXInfoLineIcon = createChartingIcon(
  <>
    <path d="M7.2 16.8L14.6 9.4" />
    <Anchor cx={5.9} cy={18.1} />
    <rect x="15.2" y="4.4" width="5.6" height="5.6" rx="1.3" strokeWidth={HAIR} />
  </>,
);

export const WariXExtendedLineIcon = createChartingIcon(
  <>
    <path d="M3.4 20.6L20.6 3.4" />
    <Anchor cx={9} cy={15} />
    <Anchor cx={15} cy={9} />
  </>,
);

export const WariXTrendAngleIcon = createChartingIcon(
  <>
    <path d="M5.2 18.4H20.2" />
    <path d="M5.2 18.4L17.4 7.4" />
    <path d="M11 18.4a5.8 5.8 0 0 0-1.5-3.9" strokeWidth={HAIR} />
    <Anchor cx={5.2} cy={18.4} />
  </>,
);

export const WariXHorizontalLineIcon = createChartingIcon(
  <>
    <path d="M3.6 12h6.6M13.8 12h6.6" />
    <Anchor cx={12} cy={12} />
  </>,
);

export const WariXHorizontalRayIcon = createChartingIcon(
  <>
    <path d="M7.4 12h13" />
    <Anchor cx={5.6} cy={12} />
  </>,
);

export const WariXVerticalLineIcon = createChartingIcon(
  <>
    <path d="M12 3.6v6.6M12 13.8v6.6" />
    <Anchor cx={12} cy={12} />
  </>,
);

export const WariXCrossLineIcon = createChartingIcon(
  <>
    <path d="M3.6 12h16.8M12 3.6v16.8" />
    <Dot cx={12} cy={12} r={1.5} />
  </>,
);

export const WariXParallelChannelIcon = createChartingIcon(
  <>
    <path d="M5.1 14.9L16.9 5.9" />
    <path d="M7.1 18.9L18.9 9.9" />
    <Anchor cx={3.9} cy={15.8} />
    <Anchor cx={18.1} cy={5} />
  </>,
);

export const WariXRegressionTrendIcon = createChartingIcon(
  <>
    <path d="M4 12.2L20 4.2" />
    <path d="M4 19.8L20 11.8" />
    <path d="M4 16L20 8" strokeWidth={HAIR} />
  </>,
);

export const WariXFlatTopBottomIcon = createChartingIcon(
  <>
    <path d="M4.6 7.2h14.8" />
    <path d="M4.6 18.6L19.4 11.4" />
    <Anchor cx={4.6} cy={7.2} />
    <Anchor cx={19.4} cy={7.2} />
  </>,
);

export const WariXDisjointChannelIcon = createChartingIcon(
  <>
    <path d="M4 17.4L12.6 9.6" />
    <path d="M11.4 15.2L20 5.8" />
    <Anchor cx={4} cy={17.4} />
    <Anchor cx={20} cy={5.8} />
  </>,
);

/**
 * The pitchfork silhouette: a median from the pivot, a crossbar, two prongs.
 * Tilted so it does not read as a bracket, which the axis-aligned version does.
 */
function pitchfork(origin: { cx: number; cy: number } | null, insideProngs = false) {
  const prongStart = insideProngs ? 13.4 : 11.4;
  return (
    <g transform="rotate(-16 12 12)">
      <path d="M4 12h16.4" />
      <path d="M11.4 6.6v10.8" />
      <path d={`M${prongStart} 6.6h${20.4 - prongStart}M${prongStart} 17.4h${20.4 - prongStart}`} />
      {origin ? <Dot cx={origin.cx} cy={origin.cy} r={1.5} /> : <Anchor cx={4} cy={12} />}
    </g>
  );
}

export const WariXPitchforkIcon = createChartingIcon(pitchfork(null));
/** Schiff — the handle is lifted to the midpoint of the first leg. */
export const WariXSchiffPitchforkIcon = createChartingIcon(pitchfork({ cx: 7.7, cy: 9.3 }));
/** Modified Schiff — lifted further, onto the crossbar's own midpoint. */
export const WariXModifiedSchiffPitchforkIcon = createChartingIcon(
  pitchfork({ cx: 11.4, cy: 9.3 }),
);
/** Inside — the prongs start inside the crossbar rather than at its ends. */
export const WariXInsidePitchforkIcon = createChartingIcon(pitchfork(null, true));
