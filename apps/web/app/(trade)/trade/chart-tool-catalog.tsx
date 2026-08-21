'use client';

import type { ReactNode } from 'react';
import {
  WariXArrowIcon,
  WariXArrowMarkerIcon,
  WariXArrowMarkDownIcon,
  WariXArrowMarkLeftIcon,
  WariXArrowMarkRightIcon,
  WariXArrowMarkUpIcon,
  WariXArcIcon,
  WariXBrushIcon,
  WariXCircleIcon,
  WariXCrossLineIcon,
  WariXCursorArrowIcon,
  WariXCursorCrossIcon,
  WariXCursorDotIcon,
  WariXCurveIcon,
  WariXDatePriceRangeIcon,
  WariXDateRangeIcon,
  WariXDisjointChannelIcon,
  WariXEllipseIcon,
  WariXEmojiIcon,
  WariXExtendedLineIcon,
  WariXEraserIcon,
  WariXFibChannelIcon,
  WariXFibCirclesIcon,
  WariXFibExtensionIcon,
  WariXFibRetracementIcon,
  WariXFlatTopBottomIcon,
  WariXHorizontalLineIcon,
  WariXHorizontalRayIcon,
  WariXInfoLineIcon,
  WariXParallelChannelIcon,
  WariXPriceRangeIcon,
  WariXRayIcon,
  WariXRectangleIcon,
  WariXRotatedRectangleIcon,
  WariXRulerIcon,
  WariXTrendAngleIcon,
  WariXTrendLineIcon,
  WariXTriangleIcon,
  WariXTextIcon,
  WariXVerticalLineIcon,
} from '@wariba/ui';
import type { ChartCursorMode, ChartTool } from './chart-tool-mode';

/**
 * The drawing-tool catalogue — the rail's and the flyouts' single source.
 *
 * **Only real tools are here.** The reference's rail opens onto roughly ninety
 * drawing tools across eight families, and reproducing that list with eighty
 * greyed-out rows would have been the easy way to look mature. §10 says the
 * opposite in as many words: *prefer a smaller real professional tool library
 * over a fake giant one*. So every entry below is a tool that draws, persists,
 * re-projects across a zoom and survives a reload — and the families that WariX
 * does not implement (pitchforks, projections, Gann, text, emoji, brushes) are
 * absent rather than present-and-dead.
 *
 * What the reference *does* buy us is the **taxonomy**, and that is what this
 * file adopts: the same family names, the same grouping, the same order, the
 * same attached-flyout interaction. A trader arriving from another terminal
 * looks for Fibonacci under a fan-shaped glyph in the middle of the rail and
 * finds it there. The families are a stable contract; adding a tool later means
 * adding one row here and one case in the geometry, not redesigning the rail.
 */

export interface ChartToolCatalogEntry {
  tool: ChartTool;
  label: string;
  icon: ReactNode;
  /** Shown right-aligned in the flyout. Only set where the shortcut is real. */
  shortcut?: string;
}

export interface ChartToolGroup {
  /** Heading inside the flyout. */
  heading: string;
  entries: ChartToolCatalogEntry[];
}

export interface ChartToolFamily {
  id: string;
  /** The rail button's accessible name and its tooltip. */
  label: string;
  /** The rail glyph when no tool in the family is held. */
  icon: ReactNode;
  groups: ChartToolGroup[];
  /** Family-specific width where long professional labels need more room. */
  width?: number;
}

export interface ChartCursorCatalogEntry {
  mode: ChartCursorMode;
  label: string;
  icon: ReactNode;
}

/** Real pointer behaviours. Demonstration/replay stays absent until it has a real engine. */
export const CHART_CURSOR_ENTRIES: readonly ChartCursorCatalogEntry[] = [
  { mode: 'cross', label: 'Croix', icon: <WariXCursorCrossIcon /> },
  { mode: 'dot', label: 'Point', icon: <WariXCursorDotIcon /> },
  { mode: 'arrow', label: 'Flèche', icon: <WariXCursorArrowIcon /> },
  { mode: 'eraser', label: 'Gomme', icon: <WariXEraserIcon /> },
];

/**
 * The families, in the reference's own rail order.
 *
 * Order is muscle memory, so it is copied deliberately: cursor, then the line
 * family, then channels, then Fibonacci, then shapes, then measurement. A trader
 * reaching for a horizontal line reaches near the top; a trader reaching for a
 * measuring tool reaches near the bottom.
 */
export const CHART_TOOL_FAMILIES: readonly ChartToolFamily[] = [
  {
    id: 'lines',
    label: 'Lignes',
    icon: <WariXTrendLineIcon />,
    groups: [
      {
        heading: 'Lignes',
        entries: [
          { tool: 'trend_line', label: 'Ligne de tendance', icon: <WariXTrendLineIcon /> },
          { tool: 'ray', label: 'Demi-droite', icon: <WariXRayIcon /> },
          { tool: 'extended_line', label: 'Droite étendue', icon: <WariXExtendedLineIcon /> },
          { tool: 'trend_angle', label: 'Angle de tendance', icon: <WariXTrendAngleIcon /> },
        ],
      },
    ],
  },
  {
    id: 'levels',
    label: 'Niveaux',
    icon: <WariXHorizontalLineIcon />,
    groups: [
      {
        heading: 'Niveaux',
        entries: [
          {
            tool: 'horizontal_line',
            label: 'Ligne horizontale',
            icon: <WariXHorizontalLineIcon />,
          },
          {
            tool: 'horizontal_ray',
            label: 'Demi-droite horizontale',
            icon: <WariXHorizontalRayIcon />,
          },
          { tool: 'vertical_line', label: 'Ligne verticale', icon: <WariXVerticalLineIcon /> },
          { tool: 'cross_line', label: 'Croix', icon: <WariXCrossLineIcon /> },
        ],
      },
    ],
  },
  {
    id: 'channels',
    label: 'Canaux',
    icon: <WariXParallelChannelIcon />,
    groups: [
      {
        heading: 'Canaux',
        entries: [
          {
            tool: 'parallel_channel',
            label: 'Canal parallèle',
            icon: <WariXParallelChannelIcon />,
          },
          {
            tool: 'flat_top_bottom',
            label: 'Canal haut/bas plat',
            icon: <WariXFlatTopBottomIcon />,
          },
          {
            tool: 'disjoint_channel',
            label: 'Canal disjoint',
            icon: <WariXDisjointChannelIcon />,
          },
        ],
      },
    ],
  },
  {
    id: 'fibonacci',
    label: 'Fibonacci',
    icon: <WariXFibRetracementIcon />,
    groups: [
      {
        heading: 'Fibonacci',
        entries: [
          {
            tool: 'fibonacci',
            label: 'Retracement de Fibonacci',
            icon: <WariXFibRetracementIcon />,
          },
          {
            tool: 'fib_extension',
            label: 'Extension de Fibonacci',
            icon: <WariXFibExtensionIcon />,
          },
          { tool: 'fib_channel', label: 'Canal de Fibonacci', icon: <WariXFibChannelIcon /> },
          { tool: 'fib_circles', label: 'Cercles de Fibonacci', icon: <WariXFibCirclesIcon /> },
        ],
      },
    ],
    width: 304,
  },
  {
    id: 'brushes',
    label: 'Pinceaux et formes',
    icon: <WariXBrushIcon />,
    groups: [
      {
        heading: 'Pinceaux',
        entries: [
          { tool: 'curve', label: 'Courbe', icon: <WariXCurveIcon /> },
          { tool: 'arc', label: 'Arc', icon: <WariXArcIcon /> },
          { tool: 'ellipse', label: 'Ellipse', icon: <WariXEllipseIcon /> },
        ],
      },
      {
        heading: 'Formes',
        entries: [
          { tool: 'rectangle', label: 'Rectangle', icon: <WariXRectangleIcon /> },
          {
            tool: 'rotated_rectangle',
            label: 'Rectangle pivoté',
            icon: <WariXRotatedRectangleIcon />,
          },
          { tool: 'circle', label: 'Cercle', icon: <WariXCircleIcon /> },
          { tool: 'triangle', label: 'Triangle', icon: <WariXTriangleIcon /> },
        ],
      },
    ],
    width: 292,
  },
  {
    id: 'annotations',
    label: 'Annotations',
    icon: <WariXTextIcon />,
    groups: [
      {
        heading: 'Annotations',
        entries: [
          { tool: 'info_line', label: 'Ligne d’information', icon: <WariXInfoLineIcon /> },
          { tool: 'arrow', label: 'Flèche', icon: <WariXArrowIcon /> },
          { tool: 'arrow_marker', label: 'Marqueur flèche', icon: <WariXArrowMarkerIcon /> },
        ],
      },
    ],
  },
  {
    id: 'markers',
    label: 'Marqueurs',
    icon: <WariXEmojiIcon />,
    groups: [
      {
        heading: 'Marqueurs',
        entries: [
          { tool: 'arrow_mark_up', label: 'Flèche vers le haut', icon: <WariXArrowMarkUpIcon /> },
          {
            tool: 'arrow_mark_down',
            label: 'Flèche vers le bas',
            icon: <WariXArrowMarkDownIcon />,
          },
          {
            tool: 'arrow_mark_left',
            label: 'Flèche vers la gauche',
            icon: <WariXArrowMarkLeftIcon />,
          },
          {
            tool: 'arrow_mark_right',
            label: 'Flèche vers la droite',
            icon: <WariXArrowMarkRightIcon />,
          },
        ],
      },
    ],
  },
  {
    id: 'measure',
    label: 'Mesure',
    icon: <WariXRulerIcon />,
    groups: [
      {
        heading: 'Mesure',
        entries: [
          { tool: 'price_range', label: 'Amplitude de prix', icon: <WariXPriceRangeIcon /> },
          { tool: 'date_range', label: 'Amplitude de temps', icon: <WariXDateRangeIcon /> },
          {
            tool: 'date_price_range',
            label: 'Amplitude prix et temps',
            icon: <WariXDatePriceRangeIcon />,
          },
        ],
      },
    ],
  },
];

/** Every catalogued entry, flattened — used by favourites and the mobile sheet. */
export const CHART_TOOL_ENTRIES: readonly ChartToolCatalogEntry[] = CHART_TOOL_FAMILIES.flatMap(
  (family) => family.groups.flatMap((group) => group.entries),
);

export function catalogEntry(tool: ChartTool): ChartToolCatalogEntry | null {
  return CHART_TOOL_ENTRIES.find((entry) => entry.tool === tool) ?? null;
}

/** Which family owns a tool, so the rail can show the held tool on its own button. */
export function familyForTool(tool: ChartTool): ChartToolFamily | null {
  return (
    CHART_TOOL_FAMILIES.find((family) =>
      family.groups.some((group) => group.entries.some((entry) => entry.tool === tool)),
    ) ?? null
  );
}

/** The pointer's own glyph — the rail's first slot, which is not a family. */
export const CURSOR_ICON = <WariXCursorCrossIcon />;

/**
 * Families named by the reference that WariX does not implement, and therefore
 * does not show.
 *
 * Recorded in code rather than in a document so that the reason travels with the
 * decision: this is what a reviewer comparing the two rails side by side will
 * ask about first. Each becomes a family above the moment its geometry and its
 * hit-testing exist — nothing else in the rail has to change.
 */
export const TOOL_FAMILIES_NOT_IMPLEMENTED: readonly string[] = [
  'Fourches (Andrews, Schiff, Schiff modifiée, intérieure)',
  'Projections (position longue/courte, prévision, motif de barres)',
  'Basés sur le volume (VWAP ancré, profil de volume) — le flux ne porte pas de volume',
  'Texte et notes (texte, note, étiquette de prix, drapeau)',
  'Pinceaux et emoji',
  'Fibonacci temps, éventails, spirales, arcs et coins',
  'Gann (boîte, carré, éventail)',
];
