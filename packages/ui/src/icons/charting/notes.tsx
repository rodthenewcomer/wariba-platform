'use client';

import { Anchor, Dot, HAIR, createChartingIcon } from './factory';

/** Text and note tools. Each is the same idea: a mark that carries words. */

export const WariXTextIcon = createChartingIcon(
  <>
    <path d="M5.4 6.4h13.2" />
    <path d="M12 6.4v13.2" />
    <path d="M9 19.6h6" strokeWidth={HAIR} />
  </>,
);

export const WariXAnchoredTextIcon = createChartingIcon(
  <>
    <path d="M9.6 6.4h10" />
    <path d="M14.6 6.4v13.2" />
    <path d="M4.8 7.6v8.8" strokeWidth={HAIR} />
    <path d="M3.4 9L4.8 7.2 6.2 9M3.4 15L4.8 16.8 6.2 15" strokeWidth={HAIR} />
  </>,
);

export const WariXNoteIcon = createChartingIcon(
  <>
    <rect x="4.8" y="4.2" width="14.4" height="10.6" rx="1.6" />
    <path d="M8 8h8M8 11h5" strokeWidth={HAIR} />
    <path d="M12 14.8v5" strokeWidth={HAIR} />
  </>,
);

export const WariXPriceNoteIcon = createChartingIcon(
  <>
    <rect x="4.8" y="4.2" width="14.4" height="10.6" rx="1.6" />
    <path d="M12 6.4v6.2" strokeWidth={HAIR} />
    <path
      d="M13.9 8.1a2 2 0 0 0-3.8 0.5c0 1.9 3.8 0.9 3.8 2.8a2 2 0 0 1-3.8 0.5"
      strokeWidth={HAIR}
    />
    <path d="M12 14.8v5" strokeWidth={HAIR} />
  </>,
);

export const WariXPinIcon = createChartingIcon(
  <>
    <path d="M12 20.8s-6.4-6.2-6.4-10.6a6.4 6.4 0 1 1 12.8 0C18.4 14.6 12 20.8 12 20.8Z" />
    <circle cx="12" cy="10" r="2.3" strokeWidth={HAIR} />
  </>,
);

export const WariXTableIcon = createChartingIcon(
  <>
    <rect x="4" y="5" width="16" height="14" rx="1.4" />
    <path d="M4 9.6h16M4 14.4h16M12 5v14" strokeWidth={HAIR} />
  </>,
);

export const WariXCalloutIcon = createChartingIcon(
  <>
    <path d="M4.4 6.4a1.6 1.6 0 0 1 1.6-1.6h12a1.6 1.6 0 0 1 1.6 1.6v8a1.6 1.6 0 0 1-1.6 1.6H6a1.6 1.6 0 0 1-1.6-1.6Z" />
    <path d="M8.6 16L7.4 20.4 12.6 16" />
  </>,
);

export const WariXCommentIcon = createChartingIcon(
  <>
    <rect x="4.2" y="5" width="15.6" height="11.4" rx="4" />
    <path d="M9 16.4L7.6 20.2 12.4 16.4" strokeWidth={HAIR} />
  </>,
);

export const WariXPriceLabelIcon = createChartingIcon(<path d="M9.4 6h10.4v12H9.4L4.2 12Z" />);

export const WariXSignpostIcon = createChartingIcon(
  <>
    <circle cx="12" cy="8.6" r="4.9" />
    <path
      d="M12 6.4l0.9 1.9 2 0.3-1.5 1.4 0.4 2-1.8-1-1.8 1 0.4-2-1.5-1.4 2-0.3Z"
      strokeWidth={HAIR}
    />
    <path d="M12 13.5v6.9" />
  </>,
);

export const WariXFlagMarkIcon = createChartingIcon(
  <>
    <path d="M6.2 3.8v16.6" />
    <path d="M6.2 5h11l-2.6 3.6L17.2 12h-11Z" strokeWidth={HAIR} />
  </>,
);

/** Brushes, arrows and shapes. */

export const WariXBrushIcon = createChartingIcon(
  <>
    <path d="M3.6 19.6c2.6 0.6 3.8-2.6 5.4-4.4" />
    <path d="M9.6 14.4l7.8-8.8a1.9 1.9 0 0 1 2.8 2.6l-8.2 8.2Z" />
  </>,
);

export const WariXHighlighterIcon = createChartingIcon(
  <>
    <path d="M8.2 16.8l7-7a1.7 1.7 0 0 1 2.4 0l1.4 1.4a1.7 1.7 0 0 1 0 2.4l-7 7H5.6l1-2.4Z" />
    <path d="M4.4 21.2h15.2" strokeWidth={2.4} />
  </>,
);

export const WariXArrowMarkerIcon = createChartingIcon(
  <>
    <path d="M4.6 19.4L18.6 5.4" />
    <path d="M12.6 5.4h6v6" strokeWidth={HAIR} />
  </>,
);

export const WariXArrowIcon = createChartingIcon(
  <>
    <path d="M4.6 19.4L16.6 7.4" />
    <path d="M11.4 6.2L19 5l-1.2 7.6Z" fill="currentColor" />
  </>,
);

function blockArrow(rotation: number) {
  return (
    <g transform={`rotate(${rotation} 12 12)`}>
      <path d="M12 3.8L18.2 11H14.6v9.2H9.4V11H5.8Z" />
    </g>
  );
}

export const WariXArrowMarkUpIcon = createChartingIcon(blockArrow(0));
export const WariXArrowMarkDownIcon = createChartingIcon(blockArrow(180));
export const WariXArrowMarkLeftIcon = createChartingIcon(blockArrow(-90));
export const WariXArrowMarkRightIcon = createChartingIcon(blockArrow(90));

export const WariXRectangleIcon = createChartingIcon(
  <>
    <rect x="5" y="6.4" width="14" height="11.2" rx="0.8" />
    <Anchor cx={5} cy={6.4} />
    <Anchor cx={19} cy={17.6} />
  </>,
);

export const WariXRotatedRectangleIcon = createChartingIcon(
  <>
    <path d="M4.2 13.4L10.6 5.2 19.8 10.6 13.4 18.8Z" />
    <Anchor cx={4.2} cy={13.4} />
    <Anchor cx={19.8} cy={10.6} />
  </>,
);

export const WariXPathIcon = createChartingIcon(
  <>
    <path d="M4 18.4L9 11.4 14 15.2 18.6 7.6" />
    <path d="M15.4 7.2L19.2 6.6 19.6 10.4" strokeWidth={HAIR} />
  </>,
);

export const WariXCircleIcon = createChartingIcon(
  <>
    <circle cx="12" cy="12" r="7.6" />
    <Dot cx={12} cy={12} r={1.3} />
  </>,
);

export const WariXEllipseIcon = createChartingIcon(
  <>
    <ellipse cx="12" cy="12" rx="8.4" ry="5.4" />
    <Anchor cx={3.6} cy={12} />
    <Anchor cx={20.4} cy={12} />
  </>,
);

export const WariXPolylineIcon = createChartingIcon(
  <>
    <path d="M5 15.8L9.2 6.4 16.2 8.4 19.6 16.6 12 20.2Z" />
    <Anchor cx={9.2} cy={6.4} />
    <Anchor cx={19.6} cy={16.6} />
  </>,
);

export const WariXTriangleIcon = createChartingIcon(
  <>
    <path d="M12 4.8L20.2 19.2H3.8Z" />
    <Anchor cx={12} cy={4.8} />
  </>,
);

export const WariXArcIcon = createChartingIcon(
  <>
    <path d="M4.2 18.2a10.4 10.4 0 0 1 15.6 0" />
    <Anchor cx={4.2} cy={18.2} />
    <Anchor cx={19.8} cy={18.2} />
  </>,
);

export const WariXCurveIcon = createChartingIcon(
  <>
    <path d="M4.2 17.4C8.6 3.8 15.4 20.2 19.8 6.6" />
    <Anchor cx={4.2} cy={17.4} />
    <Anchor cx={19.8} cy={6.6} />
  </>,
);
