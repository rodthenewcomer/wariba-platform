'use client';

/**
 * Chart display settings — the reopen pass's Settings modal, as data.
 *
 * Everything in this file is *presentation*. Nothing here is read by risk, by an
 * order, by an alert, by history or by the domain: a trader who turns the grid
 * off changes what they see and nothing about what the account is. That is why
 * it lives beside `chart-preferences.ts` and shares its browser-local,
 * account-scoped storage rather than reaching the server.
 *
 * The modal exposes only settings the WariX chart engine can apply.
 */

import type { ChartIndicatorLineWidth } from './chart-indicator-model';

/** A hex colour a trader may choose. Validated on read — storage is untrusted. */
export type HexColor = string;

const HEX = /^#[0-9a-fA-F]{6}$/;

export type ChartTimezone = 'utc' | 'local';
export type CrosshairStyle = 'dashed' | 'dotted' | 'solid';
export type ScalePlacement = 'right' | 'left';
export type GridMode = 'both' | 'horizontal' | 'vertical' | 'none';

export interface ChartSymbolSettings {
  /** Candle bodies. */
  upColor: HexColor;
  downColor: HexColor;
  bodyVisible: boolean;
  /** Borders and wicks, each with their own pair, exactly as the reference splits them. */
  bordersVisible: boolean;
  borderUpColor: HexColor;
  borderDownColor: HexColor;
  wicksVisible: boolean;
  wickUpColor: HexColor;
  wickDownColor: HexColor;
  timezone: ChartTimezone;
}

export interface ChartStatusLineSettings {
  title: boolean;
  marketStatus: boolean;
  ohlc: boolean;
  barChange: boolean;
  indicatorTitles: boolean;
  indicatorValues: boolean;
}

export interface ChartScalesSettings {
  placement: ScalePlacement;
  /** The last-price line and its scale label. The chart's one price reference. */
  currentPriceLine: boolean;
  /**
   * Chart-wide Bid and Ask lines.
   *
   * Off by default, and that is the point of the reopen pass: two permanent
   * full-width dotted lines plus the last-price line meant three horizontal
   * rules across every chart, and the one that matters — the price — had no
   * visual priority at all. Bid and Ask are still on screen continuously, in the
   * market header, the Execution Center and the Navigator's quote columns, which
   * is where a trader reads them anyway.
   */
  bidAskLines: boolean;
  /** Indicator last-value labels on the scale, colour-coded per series. */
  indicatorLabels: boolean;
  /** High and low of the visible range, as scale labels. */
  highLowLabels: boolean;
  /** Suppress a label that would collide with a higher-priority one. */
  avoidLabelCollisions: boolean;
  scaleText: boolean;
}

export interface ChartCanvasSettings {
  grid: GridMode;
  crosshairStyle: CrosshairStyle;
  /** Snap the crosshair to the nearest OHLC value. */
  crosshairMagnet: boolean;
  watermark: boolean;
  scaleLines: boolean;
}

export interface ChartDisplaySettings {
  symbol: ChartSymbolSettings;
  statusLine: ChartStatusLineSettings;
  scales: ChartScalesSettings;
  canvas: ChartCanvasSettings;
}

/**
 * The shipped defaults.
 *
 * The candle colours are the WARIBA chart tokens' own values rather than the
 * reference's teal/red, because §2 keeps the accepted art direction: a trader
 * may change them, and the modal's reset restores *these*, not TradingView's.
 */
export const DEFAULT_CHART_SETTINGS: ChartDisplaySettings = {
  symbol: {
    upColor: '#258A61',
    downColor: '#C94D4D',
    bodyVisible: true,
    bordersVisible: true,
    borderUpColor: '#258A61',
    borderDownColor: '#C94D4D',
    wicksVisible: true,
    wickUpColor: '#258A61',
    wickDownColor: '#C94D4D',
    timezone: 'utc',
  },
  statusLine: {
    title: true,
    marketStatus: true,
    ohlc: true,
    barChange: true,
    indicatorTitles: true,
    indicatorValues: true,
  },
  scales: {
    placement: 'right',
    currentPriceLine: true,
    bidAskLines: false,
    indicatorLabels: false,
    highLowLabels: false,
    avoidLabelCollisions: true,
    scaleText: true,
  },
  canvas: {
    grid: 'both',
    crosshairStyle: 'dashed',
    crosshairMagnet: false,
    watermark: true,
    scaleLines: true,
  },
};

function isHex(value: unknown): value is HexColor {
  return typeof value === 'string' && HEX.test(value);
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function color(value: unknown, fallback: HexColor): HexColor {
  return isHex(value) ? value : fallback;
}

/**
 * Parse one stored settings blob. Fails closed per field, never per document:
 * a trader who has hand-edited one colour into nonsense keeps the other
 * thirty-odd choices they made.
 */
export function parseChartSettings(value: unknown): ChartDisplaySettings {
  if (typeof value !== 'object' || value === null) return DEFAULT_CHART_SETTINGS;
  const raw = value as Record<string, unknown>;
  const symbol = (raw.symbol ?? {}) as Record<string, unknown>;
  const statusLine = (raw.statusLine ?? {}) as Record<string, unknown>;
  const scales = (raw.scales ?? {}) as Record<string, unknown>;
  const canvas = (raw.canvas ?? {}) as Record<string, unknown>;
  const d = DEFAULT_CHART_SETTINGS;

  return {
    symbol: {
      upColor: color(symbol.upColor, d.symbol.upColor),
      downColor: color(symbol.downColor, d.symbol.downColor),
      bodyVisible: bool(symbol.bodyVisible, d.symbol.bodyVisible),
      bordersVisible: bool(symbol.bordersVisible, d.symbol.bordersVisible),
      borderUpColor: color(symbol.borderUpColor, d.symbol.borderUpColor),
      borderDownColor: color(symbol.borderDownColor, d.symbol.borderDownColor),
      wicksVisible: bool(symbol.wicksVisible, d.symbol.wicksVisible),
      wickUpColor: color(symbol.wickUpColor, d.symbol.wickUpColor),
      wickDownColor: color(symbol.wickDownColor, d.symbol.wickDownColor),
      timezone: oneOf(symbol.timezone, ['utc', 'local'] as const, d.symbol.timezone),
    },
    statusLine: {
      title: bool(statusLine.title, d.statusLine.title),
      marketStatus: bool(statusLine.marketStatus, d.statusLine.marketStatus),
      ohlc: bool(statusLine.ohlc, d.statusLine.ohlc),
      barChange: bool(statusLine.barChange, d.statusLine.barChange),
      indicatorTitles: bool(statusLine.indicatorTitles, d.statusLine.indicatorTitles),
      indicatorValues: bool(statusLine.indicatorValues, d.statusLine.indicatorValues),
    },
    scales: {
      placement: oneOf(scales.placement, ['right', 'left'] as const, d.scales.placement),
      currentPriceLine: bool(scales.currentPriceLine, d.scales.currentPriceLine),
      bidAskLines: bool(scales.bidAskLines, d.scales.bidAskLines),
      indicatorLabels: bool(scales.indicatorLabels, d.scales.indicatorLabels),
      highLowLabels: bool(scales.highLowLabels, d.scales.highLowLabels),
      avoidLabelCollisions: bool(scales.avoidLabelCollisions, d.scales.avoidLabelCollisions),
      scaleText: bool(scales.scaleText, d.scales.scaleText),
    },
    canvas: {
      grid: oneOf(canvas.grid, ['both', 'horizontal', 'vertical', 'none'] as const, d.canvas.grid),
      crosshairStyle: oneOf(
        canvas.crosshairStyle,
        ['dashed', 'dotted', 'solid'] as const,
        d.canvas.crosshairStyle,
      ),
      crosshairMagnet: bool(canvas.crosshairMagnet, d.canvas.crosshairMagnet),
      watermark: bool(canvas.watermark, d.canvas.watermark),
      scaleLines: bool(canvas.scaleLines, d.canvas.scaleLines),
    },
  };
}

/** The renderer's line-style enum, from the trader's choice. */
export const CROSSHAIR_LINE_STYLE: Record<CrosshairStyle, 0 | 1 | 2 | 3 | 4> = {
  solid: 0,
  dotted: 1,
  dashed: 2,
};

/** Indicator line widths a trader may pick, shared by the library modal. */
export const INDICATOR_LINE_WIDTHS: readonly ChartIndicatorLineWidth[] = [1, 2, 3];
