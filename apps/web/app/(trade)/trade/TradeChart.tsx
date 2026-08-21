'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  createChart,
  CrosshairMode,
  PriceScaleMode,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import {
  type MarketCandle,
  type MarketTick,
  type PositionDTO,
  type SymbolSpec,
  type TradableSymbol,
  type PendingOrderDTO,
  type PendingOrderType,
  type PriceAlertDTO,
} from '@wariba/contracts';
import {
  computeRealizedPnl,
  quotedPrice,
  roundPriceToTick,
  computeLevelPnlPreview,
  isProtectionLevelValid,
  protectionPlacementFor,
  computeRiskRewardRatio,
  pendingOrderDistancePoints,
} from '@wariba/domain';
import {
  BottomSheet,
  ToolbarButton,
  WariXDeleteIcon,
  WariXDoneIcon,
  WariXPaletteIcon,
} from '@wariba/ui';
import type { RealtimeConnectionState } from '../../../lib/realtime-client';
import { resolveLabelCollisions } from './chart-overlay-geometry';
import { chartPriceFormatFor } from './chart-price-format';
import {
  PositionProtectionControls,
  DragPreviewPanel,
  PositionChip,
  TradeLevelChip,
  type LevelSyncState,
  type TradeObjectEdge,
} from './ChartPositionOverlay';
import { PendingOrderLine, AlertLine } from './ChartPendingOverlay';
import { ChartPriceScalePlates, type PriceScalePlate } from './ChartPriceScalePlates';
import { ChartContextMenuPopover, ChartContextMenuContent } from './ChartContextMenu';
import {
  createChartHistoryController,
  type ChartHistorySeriesSink,
  type ChartHistoryTransport,
} from './chart-history';
import type { TickStore } from './tick-store';
import { HISTORY_CONNECTING_MESSAGE, HISTORY_STATUS_MESSAGE } from './trade-copy';
import { resolveExecutionMarkers } from './chart-execution-markers';
import { resolveDragCardTop, type OccupiedBand } from './chart-drag-card-layout';
import { formatLotSize, formatMoney } from './trade-labels';
import { ChartToolbar, useFullscreen, type ChartStyle } from './ChartToolbar';
import { ChartStatusLine, computeBarChange } from './ChartStatusLine';
import { IndicatorLibrary } from './IndicatorLibrary';
import { ChartModal } from './ChartModal';
import { ChartSettingsModal } from './ChartSettingsModal';
import { ObjectTreeModal } from './ObjectTreeModal';
import { MobileToolsSheet } from './MobileToolsSheet';
import { ChartDrawingLayer } from './ChartDrawingLayer';
import { toRendererCandle } from './chart-renderer-adapters';
import { drawingTypeLabel } from './chart-drawing-model';
import { cursorModeLabel, toolLabel } from './chart-tool-mode';
import { legendCandle, useChartAnalysis } from './use-chart-analysis';
import { CROSSHAIR_LINE_STYLE, type ChartTimezone } from './chart-settings-model';
import { useIsDesktop } from './use-viewport';
import { DrawingToolRail } from './DrawingToolRail';
import { ChartBottomBar, type ChartScaleMode } from './ChartBottomBar';

export interface FillMarker {
  id: string;
  symbol: TradableSymbol;
  time: number;
  price: number;
  side: 'buy' | 'sell';
  effect: 'open' | 'close';
}

export type RiskLevelField = 'stop_loss' | 'take_profit';

export interface PendingRiskAction {
  positionId: string;
  field: RiskLevelField;
}

/** Appendix 07-D acceptance gate 4 — which pending order/alert modify is in flight or was just rejected, mirroring PendingRiskAction above. */
export interface PendingOrderAction {
  kind: 'pending_order' | 'alert';
  id: string;
}

export interface TradeChartProps {
  symbol: TradableSymbol;
  /**
   * W5 §79 — the scope key for browser-local chart-analysis preferences and
   * drawings. Nothing financial is keyed by it; it exists so an evaluation
   * account's annotations do not appear on a funded account's chart.
   */
  accountId: string;
  /**
   * W3 §32 — the imperative accepted-tick source the candle series is driven
   * from. The `tick` prop below is the *rendered* latest price (bid/ask lines,
   * overlays, the context menu); it cannot build a candle, because two accepted
   * ticks in one React batch produce one render and the first tick's high/low
   * would be lost. Both are needed and they are not interchangeable.
   */
  store: TickStore;
  historyTransport: ChartHistoryTransport;
  tick: MarketTick | null;
  positions: PositionDTO[];
  fills: FillMarker[];
  connectionState: RealtimeConnectionState;
  spec: SymbolSpec | null;
  accountEquity: string;
  dailyLossRemaining: string | null;
  pendingRiskAction: PendingRiskAction | null;
  commandPending: boolean;
  onCommitLevel: (params: {
    positionId: string;
    field: RiskLevelField;
    value: string | null;
  }) => void;
  onOpenManage: (positionId: string) => void;
  onClosePosition: (positionId: string) => void;
  onMarketOrderRequest: (side: 'buy' | 'sell') => void;
  onOpenPartialClose: (positionId: string) => void;
  /** Appendix 07-D — active Buy/Sell Limit/Stop orders and price alerts on this symbol. */
  pendingOrders: PendingOrderDTO[];
  alerts: PriceAlertDTO[];
  pendingOrderAction: PendingOrderAction | null;
  rejectedOrderAction: PendingOrderAction | null;
  onModifyPendingOrderTrigger: (params: { pendingOrderId: string; triggerPrice: string }) => void;
  onOpenManagePendingOrder: (pendingOrderId: string) => void;
  onCancelPendingOrder: (pendingOrderId: string) => void;
  onModifyAlertThreshold: (params: { alertId: string; thresholdPrice: string }) => void;
  onOpenManageAlert: (alertId: string) => void;
  onDeleteAlert: (alertId: string) => void;
  onPendingOrderRequest: (params: { orderType: PendingOrderType; triggerPrice: string }) => void;
  onCreateAlertHere: (thresholdPrice: string) => void;
  onOpenAlerts: () => void;
  onOpenSymbolSearch: () => void;
  onOpenMobileMarkets?: () => void;
}

/**
 * Emergency fallback for the frame before the container has been measured
 * (W1 §13). The steady-state height always comes from the ResizeObserver —
 * if this value is ever what the trader sees, the chart column has zero
 * computed height and that is the bug to fix, not this number.
 */
const CHART_FALLBACK_HEIGHT = 240;

/**
 * §15 Symbol → Timezone. Formatting only.
 *
 * The renderer hands back the same epoch seconds history stored; all this does
 * is decide which clock renders them. `Intl` is asked for the zone once per
 * call rather than a fixed offset being added, so a market that crosses a DST
 * boundary is labelled correctly on both sides of it — an offset would have
 * silently shifted every label by an hour twice a year.
 */
function buildTimeFormatter(timezone: ChartTimezone): (time: number) => string {
  const options: Intl.DateTimeFormatOptions = {
    year: '2-digit',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    ...(timezone === 'utc' ? { timeZone: 'UTC' } : {}),
  };
  const format = new Intl.DateTimeFormat('fr-FR', options);
  return (time: number) => format.format(new Date(time * 1000));
}

function readToken(element: HTMLElement, name: string, fallback: string): string {
  const value = getComputedStyle(element).getPropertyValue(name).trim();
  return value || fallback;
}

interface ChartColors {
  bid: string;
  ask: string;
  position: string;
  stopLoss: string;
  takeProfit: string;
  preview: string;
  axis: string;
}

/** Drag/exact-price session, both for an existing SL/TP line and for activating a chip that has none yet. */
interface DragSession {
  positionId: string;
  field: RiskLevelField;
  previewPrice: string;
  /** Screen Y where the drag started — a mouseup within DRAG_CLICK_THRESHOLD_PX of this is treated as a tap, not a drag. */
  startClientY: number;
  moved: boolean;
  /** Pointer Y in *plot* coordinates, for the validation card's placement. */
  pointerY?: number;
}

const DRAG_CLICK_THRESHOLD_PX = 4;

/**
 * How far from the plot's edge a pinned trade object comes to rest (VX1 §21).
 *
 * Half a chip: enough that the chip is fully drawn inside the plot rather than
 * half-swallowed by the toolbar above it or the time scale below.
 */
const OVERLAY_EDGE_PADDING = 22;

/**
 * The band a trade chip is allowed to occupy — VX1-D.1.1 §2/§3.
 *
 * **The level line never moves.** Everything here is about the *chip*: the
 * horizontal stroke and its axis plate stay at `priceToCoordinate(price)`
 * whatever happens below, and a chip that has been pinned draws a caret so it
 * can never be read as standing on the price it appears to touch.
 *
 * `TOP_CHIP_SAFE_BOUNDARY` is measured from the OHLC and indicator legends,
 * which is why it is computed per render rather than fixed: the legend grows
 * with the number of indicators, and a take profit pinned under a four-row
 * legend on a phone was landing behind it.
 *
 * `BOTTOM_CHIP_SAFE_BOUNDARY` reserves the time axis on every viewport, plus —
 * on a phone only — one lane for command feedback. That lane is the whole of
 * §3: the confirmation toast is centred over the plot on a 390px screen, and
 * the chips sit at 20% from the left, so the two *will* collide the moment a
 * stop loss happens to be low on the chart. Excluding the lane from the chip
 * band makes the collision impossible by construction rather than resolved
 * after the fact.
 */
const MOBILE_FEEDBACK_LANE = 64;

/**
 * The validation card's height, for placement purposes.
 *
 * A measured height would need a layout pass per frame of a drag; the card has
 * one shape — a heading row, a price and a two-line reason — so a constant is
 * both accurate enough and free. Erring slightly large is the safe direction:
 * it only makes the rule more cautious about what it sits near.
 */
const DRAG_CARD_HEIGHT = 104;

/**
 * The price as a plate prints it — the canonical string, at the instrument's own
 * precision, never rounded to something prettier.
 */
function formatPlatePrice(price: string, precision: number | null): string {
  if (precision === null) return price;
  const parsed = Number(price);
  return Number.isFinite(parsed) ? parsed.toFixed(precision) : price;
}

/** Drag/exact-price session for a pending order's trigger price or an alert's threshold price — see orderDrag's doc comment below. */
interface OrderDragSession {
  kind: 'pending_order' | 'alert';
  id: string;
  previewPrice: string;
  startClientY: number;
  moved: boolean;
}

/**
 * UX Architecture §22.6 — chandeliers, sélection timeframe, crosshair, zoom,
 * pan, lignes position, lignes SL/TP, prix bid/ask, historique d'exécution,
 * thème adapté. Crosshair/zoom/pan are lightweight-charts defaults, not
 * built here.
 *
 * Prompt 7 Appendix 07-C — position/SL/TP lines are now interactive: a
 * draggable HTML overlay (ChartPositionOverlay.tsx), positioned every tick
 * via `series.priceToCoordinate`, sits on top of the native `createPriceLine`
 * strokes (which stay purely visual — the stroke and its plain axis price
 * tag, nothing clickable). A drag never touches the confirmed native line;
 * it draws a second, visually distinct preview line and only commits
 * server-side on drop (`onCommitLevel`) — see the component doc comment on
 * DragSession below for the click-vs-drag disambiguation.
 *
 * W3 — candles are no longer session-local. They are hydrated from history the
 * realtime process genuinely observed from its own accepted-tick stream
 * (`chart-history.ts`, `MarketHistoryPort`), then continued live from the tick
 * store's imperative event stream. Two consequences worth stating here, because
 * this comment previously asserted the opposite:
 *
 * - a mount or reload no longer starts empty, and no longer loses the current
 *   bucket's true open — the server sends its in-progress bucket as a seed;
 * - DATA-003 still holds. No tick tape and no candle table exist anywhere:
 *   history lives in the realtime process's bounded memory, so depth is bounded
 *   by that process's uptime and nothing survives its restart. That is a real,
 *   documented product limitation, not an oversight.
 *
 * Timeframes stay limited to 5s/30s/1m for the same reason (Prompt 07's own
 * "sélection timeframe (limitée et documentée)"): longer intervals would need
 * more depth than process uptime provides.
 *
 * Fill markers (§22.6 "historique d'exécution") are restored from
 * AccountSnapshot.recentFills and updated from order_result — a separate
 * concern from market history, and unchanged by W3.
 */
export function TradeChart({
  symbol,
  accountId,
  store,
  historyTransport,
  tick,
  positions,
  fills,
  connectionState,
  spec,
  accountEquity,
  dailyLossRemaining,
  pendingRiskAction,
  commandPending,
  onCommitLevel,
  onOpenManage,
  onClosePosition,
  onMarketOrderRequest,
  onOpenPartialClose,
  pendingOrders,
  alerts,
  pendingOrderAction,
  rejectedOrderAction,
  onModifyPendingOrderTrigger,
  onOpenManagePendingOrder,
  onCancelPendingOrder,
  onModifyAlertThreshold,
  onOpenManageAlert,
  onDeleteAlert,
  onPendingOrderRequest,
  onCreateAlertHere,
  onOpenAlerts,
  onOpenSymbolSearch,
  onOpenMobileMarkets,
}: TradeChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cursorDotRef = useRef<HTMLSpanElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const barSeriesRef = useRef<ISeriesApi<'Bar'> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const bidLineRef = useRef<IPriceLine | null>(null);
  const askLineRef = useRef<IPriceLine | null>(null);
  const positionLinesRef = useRef<IPriceLine[]>([]);
  const previewLineRef = useRef<IPriceLine | null>(null);
  const pendingOrderLinesRef = useRef<IPriceLine[]>([]);
  const alertLinesRef = useRef<IPriceLine[]>([]);
  const orderPreviewLineRef = useRef<IPriceLine | null>(null);
  // lightweight-charts renders to canvas and never resolves CSS custom
  // properties itself — a raw 'var(...)' string crashes it (the same class
  // of bug fixed in PriceChart.tsx earlier in Prompt 07). Every color used
  // anywhere in this component is resolved to a real hex value once, here,
  // and reused from this ref — never passed as a live 'var(...)' string.
  const colorsRef = useRef<ChartColors>({
    bid: '#3673C9',
    ask: '#BE6945',
    position: '#6684FF',
    stopLoss: '#C94D4D',
    takeProfit: '#258A61',
    preview: '#9AA3B1',
    axis: '#3A4251',
  });
  const [chartVersion, setChartVersion] = useState(0);
  /**
   * The plot's measured box, as state rather than a ref read during render.
   *
   * The drawing overlay is sized from this. Reading `containerRef.current` at
   * render time worked only because something else happened to re-render the
   * component after the ref was attached; nothing guaranteed it, and a chart
   * that never re-rendered would have shown a 0×0 SVG and no drawings at all.
   * The ResizeObserver below is the one writer.
   */
  const [plotSize, setPlotSize] = useState({ width: 0, height: 0 });
  /**
   * True while a pane-resize-induced relayout is settling.
   *
   * Read by the visible-range subscription so a geometry change cannot be
   * mistaken for the trader panning into older history.
   */
  const resizingRef = useRef(false);

  /**
   * VX1 §21 — the rendered height of the OHLC/indicator legend.
   *
   * A trade object pinned to the top edge has to come to rest *below* the
   * legend, and the legend is one row when collapsed and six with four
   * indicators expanded. Measured rather than assumed, because a hard-coded
   * inset would put a pinned Take Profit through the OHLC row on exactly the
   * charts that have the most to read.
   */
  const [legendHeight, setLegendHeight] = useState(0);

  /**
   * The price scale's own width, so WariX's plates sit exactly over it.
   *
   * Read from the chart rather than assumed: the scale sizes itself to the
   * widest label it draws, which differs between a 5-decimal FX pair and a
   * 2-decimal index.
   */
  const [priceScaleWidth, setPriceScaleWidth] = useState(0);

  /** W5 §65 — the candle under the crosshair, held imperatively (see the subscription below). */
  const [hoveredCandle, setHoveredCandle] = useState<MarketCandle | null>(null);
  const [drag, setDrag] = useState<DragSession | null>(null);
  const dragRef = useRef<DragSession | null>(null);
  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);
  /*
   * The positions the global pointer-up handler judges a release against.
   *
   * That handler is attached once and closes over its first render, so reading
   * `positions` directly there would validate a drag against whatever the book
   * looked like when the listener was installed. A ref is the same pattern
   * `dragRef` already uses, for the same reason.
   */
  const positionsRef = useRef(positions);
  positionsRef.current = positions;

  // Appendix 07-D — a second, parallel drag session for pending-order
  // trigger-price and alert threshold-price lines. Kept independent from
  // `drag` above (position SL/TP) rather than folded into one generalized
  // state machine: the two have different commit targets
  // (onModifyPendingOrderTrigger/onModifyAlertThreshold vs onCommitLevel)
  // and different disable conditions, and this component's existing SL/TP
  // drag logic is already delicate enough that duplicating the ~30 lines of
  // pointer plumbing is safer than intertwining both concerns in one state.
  const [orderDrag, setOrderDrag] = useState<OrderDragSession | null>(null);
  const orderDragRef = useRef<OrderDragSession | null>(null);
  useEffect(() => {
    orderDragRef.current = orderDrag;
  }, [orderDrag]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    price: string;
    isTouchOrigin: boolean;
  } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressStartRef = useRef<{ x: number; y: number } | null>(null);

  const isStale = tick?.marketStatus === 'stale';
  const isDisconnected = connectionState !== 'open';
  const draggingDisabled = isStale || isDisconnected || commandPending;
  const isDesktop = useIsDesktop();
  const [chartToolsOpen, setChartToolsOpen] = useState(false);
  const [indicatorsOpen, setIndicatorsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [objectTreeOpen, setObjectTreeOpen] = useState(false);
  const [scaleMode, setScaleMode] = useState<ChartScaleMode>('normal');
  const [autoScale, setAutoScale] = useState(true);
  const [chartStyle, setChartStyle] = useState<ChartStyle>('candles');
  // Stable transient-surface commands keep the memoised desktop chart chrome
  // outside the tick render path. An inline setter here changes identity on
  // every TradeChart render and defeats the ownership boundary even though the
  // visible button state did not change.
  const openChartTools = useCallback(() => setChartToolsOpen(true), []);
  const openIndicators = useCallback(() => setIndicatorsOpen(true), []);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const openObjectTree = useCallback(() => setObjectTreeOpen(true), []);
  /** §18 — the brief confirmation after Copy price. No toast, no queue. */
  const [copiedPrice, setCopiedPrice] = useState<string | null>(null);
  const [chartLinkCopied, setChartLinkCopied] = useState(false);
  const chartColumnRef = useRef<HTMLDivElement | null>(null);
  const { fullscreen, toggle: toggleFullscreen } = useFullscreen(chartColumnRef);

  /**
   * W5 — the chart-analysis layer, reached through a ref.
   *
   * The chart-creation effect below runs once on mount and must hand the live
   * `IChartApi` to the indicator engine; the history sink must notify that same
   * engine on every series write. Both are created before `useChartAnalysis` can
   * run (it needs the history controller, which needs the sink), so they read
   * the analysis through this ref rather than closing over a value that did not
   * exist yet. Assigned at the end of every render, before any effect fires.
   */
  const analysisRef = useRef<ReturnType<typeof useChartAnalysis> | null>(null);

  // Chart instance — created once, torn down on unmount. Theme tokens are
  // read once at creation (WariX is always-dark, not user-togglable, so no
  // re-read-on-theme-change needed — see (trade)/layout.tsx).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const background = readToken(container, '--wariba-chart-background', '#0B0D12');
    const gridColor = readToken(container, '--wariba-chart-grid', '#272D3A');
    const textColor = readToken(container, '--wariba-chart-text-secondary', '#9AA3B1');
    const axisColor = readToken(container, '--wariba-chart-axis', '#3A4251');
    const crosshairColor = readToken(container, '--wariba-chart-crosshair', '#555E6E');
    const crosshairLabel = readToken(container, '--wariba-chart-crosshair-label', '#1E2433');
    const currentPriceColor = readToken(container, '--wariba-chart-current-price', '#9AA3B1');
    const upColor = readToken(container, '--wariba-chart-candle-up', '#258A61');
    const downColor = readToken(container, '--wariba-chart-candle-down', '#C94D4D');
    colorsRef.current = {
      bid: readToken(container, '--wariba-chart-bid', '#3673C9'),
      ask: readToken(container, '--wariba-chart-ask', '#BE6945'),
      position: readToken(container, '--wariba-chart-position', '#6684FF'),
      stopLoss: readToken(container, '--wariba-chart-stop-loss', '#C94D4D'),
      takeProfit: readToken(container, '--wariba-chart-take-profit', '#258A61'),
      preview: readToken(container, '--wariba-text-tertiary', '#9AA3B1'),
      axis: axisColor,
    };

    const chart = createChart(container, {
      // W1 §13 — the container owns the geometry. This literal is only the
      // pre-measurement fallback for the single frame before the
      // ResizeObserver below reports a real box (jsdom, or a container that
      // has not been laid out yet); it must never become the steady-state
      // height. `measure()` runs synchronously right after creation.
      ...(container.clientWidth > 0 ? { width: container.clientWidth } : {}),
      height: container.clientHeight || CHART_FALLBACK_HEIGHT,
      /*
       * Visual closure §9 — the chart environment is typography too.
       *
       * The price and time scales are drawn into the canvas by the library, so
       * they are the one part of WariX that CSS cannot reach: left at the
       * library's default sans they were the only proportional figures on a
       * screen where every other number is tabular mono, and they read as
       * "third-party widget" rather than as part of the instrument. Handing the
       * renderer the WARIBA mono stack at 11px is what makes the scales belong
       * to the same product as the quote deck beside them.
       */
      layout: {
        background: { color: background },
        textColor,
        fontFamily: readToken(container, '--wariba-font-mono', 'monospace'),
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      rightPriceScale: { borderColor: axisColor },
      timeScale: { borderColor: axisColor, timeVisible: true, secondsVisible: true },
      /*
       * Final closure §5 — the crosshair's own labels are WARIBA surfaces.
       *
       * `labelBackgroundColor` defaulted to the crosshair line colour, an ink-300
       * grey, so hovering the chart put a large light-grey plate on the time axis
       * ("13 Aug '26 11:16:15" in the mobile drawing evidence) and another on the
       * price scale. Those are the only two chrome elements in WariX that a
       * trader summons dozens of times a minute, and they read as a different
       * product. They now take the workstation's own control tone; the renderer
       * picks a light label colour against it automatically.
       *
       * The line itself drops from ink-300 to ink-500: a crosshair is a
       * temporary analytical aid and must sit *below* the live trading overlays
       * in the visual hierarchy (§26), which a near-white line did not.
       */
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: crosshairColor, labelBackgroundColor: crosshairLabel },
        horzLine: { color: crosshairColor, labelBackgroundColor: crosshairLabel },
      },
    });
    const series = chart.addCandlestickSeries({
      upColor,
      downColor,
      borderUpColor: upColor,
      borderDownColor: downColor,
      wickUpColor: upColor,
      wickDownColor: downColor,
      /*
       * Final closure §6 — the current-price label is market context, not a
       * trading semantic.
       *
       * Traced rather than guessed: the green plate between Ask and Bid on the
       * price scale is lightweight-charts' own *last value* label, which by
       * default inherits the last bar's colour. So it rendered emerald after an
       * up candle and coral after a down one — the two colours WariX reserves
       * for Buy and Sell. A trader glancing at the scale saw a Buy-coloured
       * price that had nothing to do with buying, and the same label changed
       * semantic colour every few seconds.
       *
       * Pinning `priceLineColor` makes the label and its dotted line neutral
       * ink. The value is unchanged and still the series' own last close — only
       * its colour stops claiming a meaning it does not have. One colour, one
       * meaning: aqua Bid, copper Ask, neutral current.
       */
      priceLineVisible: true,
      priceLineColor: currentPriceColor,
    });
    const barSeries = chart.addBarSeries({
      upColor,
      downColor,
      thinBars: true,
      visible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const lineSeries = chart.addLineSeries({
      color: upColor,
      lineWidth: 2,
      visible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const areaSeries = chart.addAreaSeries({
      lineColor: upColor,
      topColor: `${upColor}55`,
      bottomColor: `${upColor}05`,
      lineWidth: 2,
      visible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    chartRef.current = chart;
    seriesRef.current = series;
    barSeriesRef.current = barSeries;
    lineSeriesRef.current = lineSeries;
    areaSeriesRef.current = areaSeries;
    // W5 §123 — the indicator engine's series live and die with this chart.
    analysisRef.current?.attachRenderer(chart);

    /**
     * W5 §65 — the OHLC legend, driven imperatively.
     *
     * lightweight-charts' own crosshair subscription, not a React mouse handler
     * over the canvas: the latter would re-render this component on every pixel
     * of pointer movement, which §64 explicitly forbids. `setHoveredCandle` only
     * fires when the *bar* under the crosshair changes, so a slow sweep across
     * one wide bar costs nothing.
     */
    let hoveredTime: number | null = null;
    const onCrosshair = (param: { time?: Time; seriesData: Map<unknown, unknown> }) => {
      const time = typeof param.time === 'number' ? param.time : null;
      if (time === hoveredTime) return;
      hoveredTime = time;
      if (time === null) {
        setHoveredCandle(null);
        return;
      }
      /*
       * The live bar is answered from the history controller's own store.
       *
       * Introduced in VX1-D.1 to keep interpolated geometry out of the legend,
       * and kept after that layer was reverted, because it is the better read
       * on its own terms: the legend, the price plates and the impact estimates
       * now all quote the same object, so the OHLC row can never disagree with
       * the plate beside it. Settled bars behind the live one are historical
       * truth in the series and are read from there.
       */
      const live = historyRef.current.series().current;
      if (live && live.startTime === time) {
        setHoveredCandle(live);
        return;
      }
      const bar = param.seriesData.get(series) as
        { open: number; high: number; low: number; close: number } | undefined;
      setHoveredCandle(
        bar === undefined
          ? null
          : {
              startTime: time,
              open: String(bar.open),
              high: String(bar.high),
              low: String(bar.low),
              close: String(bar.close),
            },
      );
    };
    chart.subscribeCrosshairMove(onCrosshair);

    // Overlay positions depend on the price scale's visible range, which
    // can change on pan/zoom without any prop of this component changing —
    // re-render the overlay (chartVersion bump) whenever that happens, on
    // top of the tick-driven re-renders that already cover the common case.
    const bumpChartVersion = () => setChartVersion((v) => v + 1);

    /**
     * W1 §13/§14 — the fix for the W0 defect where `window.resize` applied
     * **width only** and the 360 px creation literal survived every
     * resolution (332 px of canvas at 2560×1440).
     *
     * Both dimensions are applied, and from the container's own box rather
     * than the window's: the workstation grid can change this column's size
     * without the window ever resizing (dock collapse, navigator drawer,
     * device rotation, a scrollbar appearing). A ResizeObserver is the only
     * mechanism that sees all of those.
     *
     * Every overlay coordinate (position/SL/TP lines, pending-order and
     * alert lines, drag previews, context-menu price conversion) is derived
     * from `priceToCoordinate`/`timeToCoordinate`, which both change when
     * the price scale's pixel height changes — so a resize must bump
     * chartVersion for the same reason a pan or zoom does. Without that,
     * a resized chart would keep drawing yesterday's coordinates.
     */
    let lastWidth = 0;
    let lastHeight = 0;
    /*
     * Workspace Layout Engine — geometry must never look like navigation.
     *
     * Widening the chart (by narrowing a pane) shows more bars, which moves
     * `range.from` leftward and can cross the backfill threshold. Without this
     * guard, dragging the Navigator narrower would issue a history request the
     * trader never asked for — the addendum's "no history request merely
     * because pane geometry changed", and a real hazard rather than a
     * theoretical one.
     *
     * The flag covers only range changes that are a *direct consequence* of
     * `applyOptions`, and is released two frames later. A human pan cannot
     * begin and cross the threshold inside ~32ms, so a genuine pan-left
     * immediately after a resize still backfills normally.
     */
    let resizeFrames = 0;
    const releaseResizeGuard = () => {
      resizeFrames -= 1;
      if (resizeFrames <= 0) {
        resizeFrames = 0;
        resizingRef.current = false;
      }
    };
    const measure = () => {
      const node = containerRef.current;
      if (!node) return;
      const width = node.clientWidth;
      const height = node.clientHeight;
      if (width <= 0 || height <= 0) return;
      if (width === lastWidth && height === lastHeight) return;
      // The first measurement is the chart being *sized*, not resized: it is the
      // mount, and hydration's own history request belongs to it. Guarding it
      // would suppress a genuine pan-left in the moments after load.
      const isInitialMeasure = lastWidth === 0 && lastHeight === 0;
      lastWidth = width;
      lastHeight = height;
      if (!isInitialMeasure) {
        resizingRef.current = true;
        resizeFrames += 1;
      }
      chart.applyOptions({ width, height });
      setPlotSize({ width, height });
      bumpChartVersion();
      if (!isInitialMeasure) {
        requestAnimationFrame(() => requestAnimationFrame(releaseResizeGuard));
      }
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);

    /**
     * W5 §18 — the pan-left backfill trigger, and the overlay refresh, on one
     * subscription.
     *
     * `range.from` is the leftmost visible logical bar index, so a negative or
     * small value means the trader has reached the oldest loaded candle. The
     * controller owns every guard (threshold, single-inflight, `hasMore`,
     * generation), so calling it on each event is safe and produces exactly one
     * request per page (§19/§96). No timer, no polling.
     */
    const onVisibleRangeChange = (range: { from: number; to: number } | null) => {
      // Evidence anchor for the resize engine. Updating data attributes keeps
      // the proof outside React's render path: pane geometry may expose more
      // bars on the left, but the live right edge must remain anchored. No chart
      // object or transport detail is exposed, only the two logical coordinates
      // lightweight-charts already publishes to this callback.
      const node = containerRef.current;
      if (node) {
        if (range === null) {
          node.removeAttribute('data-visible-logical-from');
          node.removeAttribute('data-visible-logical-to');
        } else {
          node.setAttribute('data-visible-logical-from', String(range.from));
          node.setAttribute('data-visible-logical-to', String(range.to));
        }
      }
      // The overlay coordinates always refresh: a resized plot must not keep
      // drawing yesterday's pixel positions.
      bumpChartVersion();
      // The *request* is what geometry may not cause.
      if (resizingRef.current) return;
      if (range !== null) historyRef.current?.maybeRequestOlder(range.from);
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(onVisibleRangeChange);

    return () => {
      observer.disconnect();
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onVisibleRangeChange);
      chart.unsubscribeCrosshairMove(onCrosshair);
      analysisRef.current?.detachRenderer();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      barSeriesRef.current = null;
      lineSeriesRef.current = null;
      areaSeriesRef.current = null;
      bidLineRef.current = null;
      askLineRef.current = null;
      positionLinesRef.current = [];
      previewLineRef.current = null;
      pendingOrderLinesRef.current = [];
      alertLinesRef.current = [];
      orderPreviewLineRef.current = null;
    };
  }, []);

  /**
   * W3 §41/§42 — the renderer boundary the history controller writes through.
   *
   * Stable for the component's lifetime and reads `seriesRef`/`chartRef` at call
   * time, so it survives chart re-creation without the controller knowing. One
   * `setData` per hydration, one `update` per accepted tick — never a whole
   * series per tick.
   */
  const sink = useMemo<ChartHistorySeriesSink>(
    () => ({
      setData: (candles) => {
        const ohlc = candles.map(toRendererCandle);
        const closes = ohlc.map((candle) => ({ time: candle.time, value: candle.close }));
        seriesRef.current?.setData(ohlc);
        barSeriesRef.current?.setData(ohlc);
        lineSeriesRef.current?.setData(closes);
        areaSeriesRef.current?.setData(closes);
        analysisRef.current?.onSeriesReplaced();
      },
      update: (candle) => {
        /*
         * One accepted tick, drawn once, with the price the feed actually sent.
         *
         * VX1-D.1 routed this through an easing layer that re-issued
         * `series.update()` with intermediate OHLC. It looked right, and the
         * cost was not worth it: the chart's own `seriesData` then held numbers
         * the market never printed, so every consumer that reads a bar back out
         * of the renderer — the crosshair today, anything added tomorrow —
         * became a place a fabricated price could surface. Guarding one caller
         * is not a guarantee; not writing the value is.
         *
         * VX1-D.1.1 §5 reverts it. The series is authoritative again, and the
         * terminal stays alive through the effects that never touch market
         * truth: the travelling price plate, quote feedback, P&L and account
         * motion, the feed glyph, execution physics and drag.
         */
        const ohlc = toRendererCandle(candle);
        const close = { time: ohlc.time, value: ohlc.close };
        seriesRef.current?.update(ohlc);
        barSeriesRef.current?.update(ohlc);
        lineSeriesRef.current?.update(close);
        areaSeriesRef.current?.update(close);
        analysisRef.current?.onSeriesLiveUpdate();
      },
      fitContent: () => chartRef.current?.timeScale().fitContent(),
      /**
       * W5 §21 — the viewport-preserving prepend, and the reason it is the
       * renderer's job rather than the controller's.
       *
       * lightweight-charts indexes its time scale by *bar position*, so
       * prepending N older bars moves every bar the trader is looking at N
       * places to the right. Reading the logical range before the write and
       * re-applying it shifted by exactly N puts the same candle back under the
       * same pixel. `fitContent()` is deliberately not called: a trader who
       * panned back two hours to look at something did not ask to be returned
       * to the live edge (§21/§75).
       *
       * The indicator rebuild happens between the two, inside the same frame, so
       * the lines and the candles are never briefly out of step. Every indicator
       * point sits on a real candle time (see `INDICATOR_GAP_VISUAL_POLICY`), so
       * no analytical series can add a bar slot and invalidate the shift.
       */
      prepend: (candles, prependedCount) => {
        const chart = chartRef.current;
        const timeScale = chart?.timeScale();
        const before = timeScale?.getVisibleLogicalRange() ?? null;
        const ohlc = candles.map(toRendererCandle);
        const closes = ohlc.map((candle) => ({ time: candle.time, value: candle.close }));
        seriesRef.current?.setData(ohlc);
        barSeriesRef.current?.setData(ohlc);
        lineSeriesRef.current?.setData(closes);
        areaSeriesRef.current?.setData(closes);
        analysisRef.current?.onSeriesReplaced();
        if (timeScale && before && prependedCount > 0) {
          timeScale.setVisibleLogicalRange({
            from: before.from + prependedCount,
            to: before.to + prependedCount,
          });
        }
      },
    }),
    [],
  );

  /**
   * W3 §30 — the chart's history state machine, created once.
   *
   * `store` and `historyTransport` are both created once per session
   * (`useState` initialisers in useTradeSession), so capturing them in this
   * initialiser is safe; if the session is torn down, this component unmounts
   * with it.
   */
  const [history] = useState(() =>
    createChartHistoryController({ transport: historyTransport, ticks: store, sink }),
  );
  useEffect(() => () => history.dispose(), [history]);
  // Read by the chart-creation effect's visible-range handler, which is
  // registered once and must not capture a stale controller.
  const historyRef = useRef(history);
  historyRef.current = history;

  const analysis = useChartAnalysis({
    accountId,
    symbol,
    pricePrecision: spec?.pricePrecision ?? null,
    history,
    chartRef,
    seriesRef,
    containerRef,
    chartVersion,
  });
  analysisRef.current = analysis;

  const historyState = useSyncExternalStore(
    useCallback((onChange: () => void) => history.subscribe(onChange), [history]),
    () => history.snapshot(),
    () => history.snapshot(),
  );

  /**
   * W3 §86 — hydration waits for the symbol's spec, because mid must be rounded
   * at the instrument's own precision before it can be compared with the
   * server's. Until then the chart is honestly `idle`, not wrongly `empty`.
   */
  const pricePrecision = spec?.pricePrecision ?? null;
  useEffect(() => {
    if (pricePrecision === null) return;
    // W5 §16 — and for the trader's stored interval, which arrives from browser
    // storage after mount. Hydrating at the default first would send one history
    // request that is discarded a frame later.
    if (!analysis.preferencesLoaded) return;
    history.start({ symbol, timeframe: analysis.timeframe, pricePrecision });
  }, [history, symbol, analysis.timeframe, analysis.preferencesLoaded, pricePrecision]);

  /**
   * Visual closure §6 — teach the renderer this instrument's own precision.
   *
   * Applied here rather than at `addCandlestickSeries` above because the chart
   * is created once on mount, while the spec arrives asynchronously over the
   * websocket and changes with the selected symbol. Creating the series with a
   * format would have baked in whichever spec happened to be loaded first —
   * which on a cold session is none at all.
   *
   * Every label lightweight-charts draws reads from this one option: the
   * price-scale ticks, the crosshair label, and the Bid/Ask/position/SL/TP/
   * pending-order/alert axis labels attached to each `createPriceLine`. The
   * overlay's own text is unaffected — it prints the server's `priceFormatted`
   * strings verbatim and always did.
   */
  useEffect(() => {
    if (pricePrecision === null) return;
    const priceFormat = chartPriceFormatFor(pricePrecision);
    seriesRef.current?.applyOptions({ priceFormat });
    barSeriesRef.current?.applyOptions({ priceFormat });
    lineSeriesRef.current?.applyOptions({ priceFormat });
    areaSeriesRef.current?.applyOptions({ priceFormat });
  }, [pricePrecision]);

  /**
   * Reopen §6-§8/§15/§23 — the Settings modal, applied to the renderer.
   *
   * A separate effect rather than options passed to `createChart`, for the same
   * reason `priceFormat` is: the chart is created once on mount, while the
   * trader's stored settings arrive from browser storage a tick later. Baking
   * them in at creation would have shown the shipped defaults on every load and
   * then swapped them, and a settings change would have required tearing the
   * chart down. `applyOptions` is the renderer's own incremental path, so a
   * checkbox in the modal repaints without touching series, history or drawings.
   */
  const chartSettings = analysis.settings;
  useEffect(() => {
    const chart = chartRef.current;
    const container = containerRef.current;
    if (!chart || !container) return;
    const { canvas, scales, symbol: symbolSettings } = chartSettings;

    const grid = readToken(container, '--wariba-chart-grid', '#1A2130');
    const axis = readToken(container, '--wariba-chart-axis', '#3A4251');
    const crosshairColor = readToken(container, '--wariba-chart-crosshair', '#C0C6D0');
    const crosshairLabel = readToken(container, '--wariba-chart-crosshair-label', '#1E2433');
    const watermarkColor = readToken(container, '--wariba-chart-watermark', '#151A25');
    const textColor = readToken(container, '--wariba-chart-text-secondary', '#9AA3B1');

    const showVert = canvas.grid === 'both' || canvas.grid === 'vertical';
    const showHorz = canvas.grid === 'both' || canvas.grid === 'horizontal';
    const line = CROSSHAIR_LINE_STYLE[canvas.crosshairStyle];

    chart.applyOptions({
      grid: {
        vertLines: { visible: showVert, color: grid },
        horzLines: { visible: showHorz, color: grid },
      },
      /*
       * §8 — the crosshair is a primary reading tool, so it is drawn *above* the
       * grid's tone rather than inside it. At ink-500 it measured a step away
       * from the grid lines it crosses and disappeared over a dense candle run;
       * ink-200 is off-white, unmistakable at a glance, and still a full step
       * below the candle bodies so it cannot outrank live market data. Style is
       * the second separator: dashed by default, which no drawing and no trading
       * level uses.
       */
      crosshair: {
        mode: canvas.crosshairMagnet ? CrosshairMode.Magnet : CrosshairMode.Normal,
        vertLine: {
          visible: analysis.cursorMode === 'cross',
          color: crosshairColor,
          width: 1,
          style: line,
          labelBackgroundColor: crosshairLabel,
        },
        horzLine: {
          visible: analysis.cursorMode === 'cross',
          color: crosshairColor,
          width: 1,
          style: line,
          labelBackgroundColor: crosshairLabel,
        },
      },
      /*
       * §23 — a restrained instrument watermark. It is the chart's identity when
       * several are open, and it is drawn at ink-870, one step off the plot
       * background: legible as a shape, incapable of competing with a candle.
       */
      watermark: {
        visible: canvas.watermark,
        text: symbol,
        color: watermarkColor,
        fontSize: 64,
        fontFamily: readToken(container, '--wariba-font-mono', 'monospace'),
        horzAlign: 'center',
        vertAlign: 'center',
      },
      rightPriceScale: {
        visible: scales.placement === 'right',
        borderVisible: canvas.scaleLines,
        borderColor: axis,
      },
      leftPriceScale: {
        visible: scales.placement === 'left',
        borderVisible: canvas.scaleLines,
        borderColor: axis,
      },
      timeScale: { borderVisible: canvas.scaleLines, borderColor: axis },
      layout: {
        textColor: scales.scaleText ? textColor : 'rgba(0,0,0,0)',
        attributionLogo: false,
      },
      /*
       * §15 Symbol → Timezone. The renderer draws its own axis labels, so a
       * timezone is a formatter rather than a data transform: the candles keep
       * their epoch-second `startTime` exactly as history recorded it, and only
       * the label above them changes. Nothing in W3's history semantics moves.
       */
      localization: { timeFormatter: buildTimeFormatter(symbolSettings.timezone) },
    });
  }, [chartSettings, symbol, analysis.cursorMode]);

  /** Candle appearance — §15 Symbol. */
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    const { symbol: s, scales } = chartSettings;
    const container = containerRef.current;
    const currentPriceColor = container
      ? readToken(container, '--wariba-chart-current-price', '#9AA3B1')
      : '#9AA3B1';
    series.applyOptions({
      upColor: s.bodyVisible && chartStyle === 'candles' ? s.upColor : 'rgba(0,0,0,0)',
      downColor: s.bodyVisible && chartStyle === 'candles' ? s.downColor : 'rgba(0,0,0,0)',
      borderVisible: s.bordersVisible && chartStyle === 'candles',
      borderUpColor: s.borderUpColor,
      borderDownColor: s.borderDownColor,
      wickVisible: s.wicksVisible && chartStyle === 'candles',
      wickUpColor: s.wickUpColor,
      wickDownColor: s.wickDownColor,
      /*
       * §7, and VX1 §11 — one clear current-price reference, and it is *market*
       * context rather than a trading semantic.
       *
       * Finely dotted and ice: dotted so it never reads as one of the three
       * trade rules (solid entry, dashed TP, dashed SL), and ice because a
       * current price that turned emerald whenever the trader happened to be
       * long would be claiming a meaning the market does not have.
       */
      priceLineVisible: scales.currentPriceLine,
      priceLineColor: currentPriceColor,
      priceLineWidth: 1,
      priceLineStyle: 1,
      // Same reason as the trade levels above: WariX draws this plate itself so
      // it can step aside for an entry a few ticks away instead of covering it.
      lastValueVisible: false,
    });
    barSeriesRef.current?.applyOptions({
      visible: chartStyle === 'bars',
      upColor: s.upColor,
      downColor: s.downColor,
    });
    lineSeriesRef.current?.applyOptions({
      visible: chartStyle === 'line',
      color: s.upColor,
    });
    areaSeriesRef.current?.applyOptions({
      visible: chartStyle === 'area',
      lineColor: s.upColor,
      topColor: `${s.upColor}55`,
      bottomColor: `${s.upColor}05`,
    });
    setChartVersion((v) => v + 1);
  }, [chartSettings, chartStyle]);

  // Symbol or timeframe change: drop the interaction state that belonged to the
  // previous instrument/interval. The candle series itself is the history
  // controller's business (it clears and rehydrates on identity change), and the
  // markers are restored by their own effect below.
  useEffect(() => {
    seriesRef.current?.setMarkers([]);
    setDrag(null);
    setOrderDrag(null);
    setContextMenu(null);
  }, [symbol, analysis.timeframe]);

  /**
   * Reopen §6 — the chart no longer paints Bid and Ask across the plot.
   *
   * Traced before it was changed, as §6 requires. The two lines came from right
   * here: one `createPriceLine` per side, torn down and rebuilt on **every
   * accepted tick**, each `axisLabelVisible` and each spanning the full plot
   * width. Together with the series' own last-value line that put three
   * permanent horizontal rules across every WariX chart, all three within a
   * spread of each other, and the one a trader actually reads — the price — had
   * no visual priority over the other two. The right price scale carried three
   * stacked plates in the same band for the same reason.
   *
   * Bid and Ask did not lose a home: they are on screen continuously in the
   * chart's own module header, in the Execution Center's quote deck and in the
   * Navigator's BID/ASK columns. What they lost is the claim to be chart
   * geometry. The setting stays for a trader who wants them back — it is off by
   * default, which is the change.
   *
   * The rebuild-per-tick shape is kept for the same reason it existed:
   * `createPriceLine` has no update-in-place API. It now runs only when the
   * trader has asked for the lines.
   */
  const bidAskLinesEnabled = chartSettings.scales.bidAskLines;
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    if (bidLineRef.current) {
      series.removePriceLine(bidLineRef.current);
      bidLineRef.current = null;
    }
    if (askLineRef.current) {
      series.removePriceLine(askLineRef.current);
      askLineRef.current = null;
    }
    if (!bidAskLinesEnabled || !tick) return;
    bidLineRef.current = series.createPriceLine({
      price: Number(tick.bid),
      color: colorsRef.current.bid,
      lineWidth: 1,
      lineStyle: 3,
      axisLabelVisible: true,
      title: 'Bid',
    });
    askLineRef.current = series.createPriceLine({
      price: Number(tick.ask),
      color: colorsRef.current.ask,
      lineWidth: 1,
      lineStyle: 3,
      axisLabelVisible: true,
      title: 'Ask',
    });
    setChartVersion((v) => v + 1);
  }, [tick, bidAskLinesEnabled]);

  // Position + SL/TP native lines for the selected symbol — rebuilt
  // whenever the open-position list changes (a fill, a close, an SL/TP
  // edit). Never removed just because a drag is in progress — only an
  // authoritative position update (this prop) ever changes these.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    for (const line of positionLinesRef.current) series.removePriceLine(line);
    positionLinesRef.current = [];

    /*
     * VX1 §13/§14/§15 — one line grammar, three identities.
     *
     * Entry is a solid cobalt rule: it is a fact, and the only one of the three
     * that cannot be moved. The two protective levels are dashed because they
     * are intentions — emerald for the one that pays, coral for the one that
     * costs — and dashes are what separates "where I said to get out" from
     * "where I got in" at a glance, before colour is even read.
     *
     * The `title` is gone from all three. lightweight-charts prints it *on* the
     * line, which is a second label saying what the chip attached to the same
     * line already says in a typeface WariX controls; the coloured axis plate
     * keeps carrying the price.
     */
    /*
     * VX1-A.1 §1 — the stroke is the library's, the plate is ours.
     *
     * `axisLabelVisible` is off on all three: lightweight-charts draws its
     * labels into the canvas with no collision handling, so an entry a few ticks
     * from the market printed two plates on top of each other. The plates are
     * drawn as HTML by `ChartPriceScalePlates`, which lays them out by priority
     * and connects any it had to displace back to its own line.
     */
    for (const position of positions) {
      positionLinesRef.current.push(
        series.createPriceLine({
          price: Number(position.averageOpenPrice),
          color: colorsRef.current.position,
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: false,
          title: '',
        }),
      );
      if (position.stopLoss) {
        positionLinesRef.current.push(
          series.createPriceLine({
            price: Number(position.stopLoss),
            color: colorsRef.current.stopLoss,
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: false,
            title: '',
          }),
        );
      }
      if (position.takeProfit) {
        positionLinesRef.current.push(
          series.createPriceLine({
            price: Number(position.takeProfit),
            color: colorsRef.current.takeProfit,
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: false,
            title: '',
          }),
        );
      }
    }
    setChartVersion((v) => v + 1);
  }, [positions]);

  // Appendix 07-D — pending-order trigger-price and alert threshold-price
  // native lines, same rebuild-on-every-change approach as the position
  // lines above (createPriceLine has no update-in-place API). `pendingOrders`
  // and `alerts` are already filtered to this chart's own symbol by the
  // caller (TradeClient), same convention as `positions`.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    for (const line of pendingOrderLinesRef.current) series.removePriceLine(line);
    pendingOrderLinesRef.current = [];
    for (const line of alertLinesRef.current) series.removePriceLine(line);
    alertLinesRef.current = [];

    for (const order of pendingOrders) {
      const isBuy = order.side === 'buy';
      pendingOrderLinesRef.current.push(
        series.createPriceLine({
          price: Number(order.triggerPrice),
          color: isBuy ? colorsRef.current.position : colorsRef.current.takeProfit,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: order.orderType,
        }),
      );
    }
    for (const alert of alerts) {
      alertLinesRef.current.push(
        series.createPriceLine({
          price: Number(alert.thresholdPrice),
          color: colorsRef.current.preview,
          lineWidth: 1,
          lineStyle: 3,
          axisLabelVisible: true,
          title: alert.direction === 'cross_above' ? 'Alerte ↑' : 'Alerte ↓',
        }),
      );
    }
    setChartVersion((v) => v + 1);
  }, [pendingOrders, alerts]);

  // The DRAGGING_PREVIEW line — a second, visually distinct native line at
  // the in-progress preview price, separate from the confirmed SL/TP line
  // above so the two are never visually confused (§5's explicit requirement).
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    if (previewLineRef.current) {
      series.removePriceLine(previewLineRef.current);
      previewLineRef.current = null;
    }
    if (drag) {
      /*
       * VX1-A.1 §5 — the line brightens with the grab.
       *
       * The preview used to be neutral grey, which read as a third kind of line
       * rather than as *this* level being moved. It now takes the level's own
       * colour at solid weight against its dashed resting form: same identity,
       * unmistakably the one in hand. It remains a separate line from the
       * confirmed one, which never advances until the server says so.
       */
      previewLineRef.current = series.createPriceLine({
        price: Number(drag.previewPrice),
        color:
          drag.field === 'stop_loss' ? colorsRef.current.stopLoss : colorsRef.current.takeProfit,
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: drag.field === 'stop_loss' ? 'SL (aperçu)' : 'TP (aperçu)',
      });
    }
  }, [drag]);

  // Same DRAGGING_PREVIEW treatment for an in-progress pending-order/alert
  // line drag — see orderDrag's doc comment above.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    if (orderPreviewLineRef.current) {
      series.removePriceLine(orderPreviewLineRef.current);
      orderPreviewLineRef.current = null;
    }
    if (orderDrag) {
      orderPreviewLineRef.current = series.createPriceLine({
        price: Number(orderDrag.previewPrice),
        color: colorsRef.current.preview,
        lineWidth: 2,
        lineStyle: 1,
        axisLabelVisible: true,
        title: orderDrag.kind === 'pending_order' ? 'Ordre (aperçu)' : 'Alerte (aperçu)',
      });
    }
  }, [orderDrag]);

  /*
   * Execution history (§22.6) — VX1-D.1.1 §4.
   *
   * **Why the labels are gone.** Every fill used to print `Entrée 1.09330` or
   * `Clôture 1.09338` beside its bar. One trade looked fine. A session of
   * scalping does not: the sandbox feed keeps the price in a narrow band, so a
   * handful of open/close cycles stacks four, six, eight full-strength labels
   * on top of each other around the live edge — directly over the entry line,
   * the current-price plate and whichever protective level happens to be
   * nearby. The clutter grows without bound and it grows *exactly* where the
   * trader is reading.
   *
   * The arrows stay: they are the execution-history layer, and they mark where
   * and which way each fill happened without competing for the same pixels as
   * the live trade objects. Nothing is lost, because the *active* entry is
   * already stated three times over — by its own line, its chip and its axis
   * plate — and every historical fill keeps its exact price, with a timestamp,
   * in the dock's Trades panel, which is where a fill is looked up.
   */
  useEffect(() => {
    if (!seriesRef.current) return;
    const markers: SeriesMarker<Time>[] = resolveExecutionMarkers(fills, {
      compact: !isDesktop,
    }).map((cluster) => ({
      time: cluster.time as UTCTimestamp,
      position: (cluster.side === 'buy' ? 'belowBar' : 'aboveBar') as 'belowBar' | 'aboveBar',
      color: cluster.effect === 'open' ? colorsRef.current.position : colorsRef.current.axis,
      shape: (cluster.side === 'buy' ? 'arrowUp' : 'arrowDown') as 'arrowUp' | 'arrowDown',
      // §2 — one marker plus a count, never a column of arrows. A single fill
      // stays a bare arrow, so the count only ever appears when it is telling
      // the trader something they could not otherwise see.
      ...(cluster.count > 1 ? { text: `×${cluster.count}` } : {}),
    }));
    seriesRef.current.setMarkers(markers);
  }, [fills, isDesktop]);

  // Global pointermove/pointerup — attached once, gated on dragRef so this
  // works uniformly for mouse and touch without duplicating the handlers,
  // and keeps tracking the pointer even if it leaves the chart container
  // mid-drag (a real click-and-drag gesture routinely does).
  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const session = dragRef.current;
      const series = seriesRef.current;
      const container = containerRef.current;
      if (!session || !series || !container || !spec) return;
      if (event.cancelable) event.preventDefault();
      const rect = container.getBoundingClientRect();
      const y = event.clientY - rect.top;
      const rawPrice = series.coordinateToPrice(y);
      if (rawPrice === null) return;
      const rounded = roundPriceToTick({
        price: String(rawPrice),
        pricePrecision: spec.pricePrecision,
      });
      const moved = Math.abs(event.clientY - session.startClientY) > DRAG_CLICK_THRESHOLD_PX;
      setDrag({
        ...session,
        previewPrice: rounded,
        moved: moved || session.moved,
        // VX1-D.1.2 §1 — which way the gesture is going, so the validation card
        // can take the half of the plot the trader is *not* looking at.
        pointerY: y,
      });
    };
    const handleUp = (event: PointerEvent) => {
      const session = dragRef.current;
      if (!session) return;
      setDrag(null);
      // A tap (never moved beyond the click threshold) opens exact-price
      // entry instead of committing a drag — see LevelChip/LevelHandle's
      // onActivate, which already handles the "click" case directly; this
      // only fires the drag commit for an actual drag gesture.
      /*
       * VX1-D.1 §8 — released in an illegal zone, nothing is sent.
       *
       * A "stop loss" above the entry of a long is not a stop loss placed
       * badly; it is not a stop loss. Sending it would spend a round trip to be
       * told so, and would leave the trader watching a line snap back with no
       * explanation. So the level simply stays where the server last confirmed
       * it — the authoritative price never moved, because a drag preview never
       * writes one.
       *
       * This is not a second risk engine: nothing here evaluates margin, loss
       * budgets or exposure. Those remain the server's, and a *legal* level is
       * still sent for the server to accept or refuse on its own terms.
       */
      const position = positionsRef.current.find(
        (candidate) => candidate.id === session.positionId,
      );
      const legal =
        position === undefined ||
        isProtectionLevelValid({
          side: position.side,
          kind: session.field,
          entryPrice: position.averageOpenPrice,
          levelPrice: session.previewPrice,
        });
      if (session.moved && legal) {
        onCommitLevel({
          positionId: session.positionId,
          field: session.field,
          value: session.previewPrice,
        });
      }
      event.preventDefault();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dragRef.current) {
        setDrag(null);
      }
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', () => setDrag(null));
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [spec, onCommitLevel]);

  // Same global pointermove/pointerup wiring as above, for orderDrag — kept
  // as its own effect/listeners rather than merged into the one above (see
  // orderDrag's doc comment for why the two sessions stay independent).
  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const session = orderDragRef.current;
      const series = seriesRef.current;
      const container = containerRef.current;
      if (!session || !series || !container || !spec) return;
      if (event.cancelable) event.preventDefault();
      const rect = container.getBoundingClientRect();
      const y = event.clientY - rect.top;
      const rawPrice = series.coordinateToPrice(y);
      if (rawPrice === null) return;
      const rounded = roundPriceToTick({
        price: String(rawPrice),
        pricePrecision: spec.pricePrecision,
      });
      const moved = Math.abs(event.clientY - session.startClientY) > DRAG_CLICK_THRESHOLD_PX;
      setOrderDrag({ ...session, previewPrice: rounded, moved: moved || session.moved });
    };
    const handleUp = () => {
      const session = orderDragRef.current;
      if (!session) return;
      setOrderDrag(null);
      if (session.moved) {
        if (session.kind === 'pending_order') {
          onModifyPendingOrderTrigger({
            pendingOrderId: session.id,
            triggerPrice: session.previewPrice,
          });
        } else {
          onModifyAlertThreshold({ alertId: session.id, thresholdPrice: session.previewPrice });
        }
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && orderDragRef.current) {
        setOrderDrag(null);
      }
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', () => setOrderDrag(null));
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [spec, onModifyPendingOrderTrigger, onModifyAlertThreshold]);

  const startOrderDrag =
    (kind: OrderDragSession['kind'], id: string, initialPrice: string) =>
    (event: React.PointerEvent) => {
      if (draggingDisabled) return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setOrderDrag({
        kind,
        id,
        previewPrice: initialPrice,
        startClientY: event.clientY,
        moved: false,
      });
    };

  const startDrag =
    (positionId: string, field: RiskLevelField, initialPrice: string) =>
    (event: React.PointerEvent) => {
      if (draggingDisabled) return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setDrag({
        positionId,
        field,
        previewPrice: initialPrice,
        startClientY: event.clientY,
        moved: false,
      });
    };

  // Prompt 7 Appendix 07-C §7/§13 — desktop right-click opens the context
  // menu anchored at the clicked point; mobile has no right-click, so a
  // ~500ms touch-and-hold does the same job. Both compute the clicked
  // price the same way the drag preview does (coordinateToPrice + round to
  // tick) so the menu's "Price X" header is exact, not approximate.
  const priceAtClientY = (clientY: number): string | null => {
    const series = seriesRef.current;
    const container = containerRef.current;
    if (!series || !container || !spec) return null;
    const rect = container.getBoundingClientRect();
    const rawPrice = series.coordinateToPrice(clientY - rect.top);
    if (rawPrice === null) return null;
    return roundPriceToTick({ price: String(rawPrice), pricePrecision: spec.pricePrecision });
  };

  const handleContextMenuEvent = (event: React.MouseEvent) => {
    // W5 §58 — while a drawing tool is held, a right-click belongs to the tool's
    // mode, not to the trade menu. One gesture, one meaning.
    if (analysis.drawingModeActive) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    const price = priceAtClientY(event.clientY);
    if (!price) return;
    setDrag(null);
    setContextMenu({ x: event.clientX, y: event.clientY, price, isTouchOrigin: false });
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
    longPressStartRef.current = null;
  };

  /**
   * W5 §57/§58/§60 — one pointer-down, one owner.
   *
   * The drawing layer is offered the gesture first *and only reaches here at
   * all* when the pointer missed every trading overlay: position badges, SL/TP
   * handles, pending-order lines and alert lines are sibling elements painted
   * above this container, so a press on one of them never becomes a container
   * event. That is §57's priority, enforced by the DOM rather than by a
   * hand-maintained hit-test ordering.
   *
   * When the drawing layer does consume the gesture — a tool is active, or a
   * drawing was grabbed — the long-press timer is not armed, so a touch cannot
   * open the trade context menu *and* draw at the same time (§60/§117).
   */
  const handleContainerPointerDown = (event: React.PointerEvent) => {
    const consumed = analysis.handlePointerDown(event);
    if (consumed) {
      clearLongPressTimer();
      return;
    }
    if (event.pointerType !== 'touch') return;
    if ((event.target as HTMLElement).closest('button')) return;
    longPressStartRef.current = { x: event.clientX, y: event.clientY };
    longPressTimerRef.current = setTimeout(() => {
      const start = longPressStartRef.current;
      if (!start) return;
      const price = priceAtClientY(start.y);
      if (!price) return;
      setContextMenu({ x: start.x, y: start.y, price, isTouchOrigin: true });
    }, 500);
  };

  const handleContainerPointerMove = (event: React.PointerEvent) => {
    const dot = cursorDotRef.current;
    const container = containerRef.current;
    if (dot && container) {
      if (analysis.cursorMode === 'dot' && event.pointerType !== 'touch') {
        const rect = container.getBoundingClientRect();
        dot.style.display = 'block';
        dot.style.transform = `translate3d(${event.clientX - rect.left - 4}px, ${event.clientY - rect.top - 4}px, 0)`;
      } else {
        dot.style.display = 'none';
      }
    }
    analysis.handlePointerMove(event);
    const start = longPressStartRef.current;
    if (!start || event.pointerType !== 'touch') return;
    if (Math.abs(event.clientX - start.x) > 10 || Math.abs(event.clientY - start.y) > 10) {
      clearLongPressTimer();
    }
  };

  const handleContainerPointerUp = (event: React.PointerEvent) => {
    analysis.handlePointerUp(event);
    clearLongPressTimer();
  };

  useEffect(() => {
    const root = containerRef.current?.parentElement;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const node = root.querySelector('[data-testid="chart-status-line"]');
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setLegendHeight(Math.round(entry.contentRect.height));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const width = chart.priceScale('right').width();
    setPriceScaleWidth((current) => (current === width ? current : width));
  }, [chartVersion, plotSize.width, pricePrecision]);

  const referencePriceFor = (position: PositionDTO): string | null => {
    if (!tick) return null;
    return quotedPrice({
      bid: tick.bid,
      ask: tick.ask,
      positionSide: position.side,
      action: 'close',
    });
  };

  // One overlay item per position (badge) plus one per active SL/TP line —
  // Y coordinates computed fresh every render (chartVersion/tick/positions
  // all bump it), then collision-resolved so two nearby prices never
  // produce overlapping labels (§3's "collision-aware label placement").
  const overlay = useMemo(() => {
    const series = seriesRef.current;
    if (!series || !spec) return null;
    void chartVersion; // recompute on chart scale/tick/position changes — see effects above.

    const badgeInputs: { id: string; y: number; height: number }[] = [];
    const levelInputs: { id: string; y: number; height: number }[] = [];
    const badgeY = new Map<string, number>();
    const levelY = new Map<string, number>();
    const edge = new Map<string, TradeObjectEdge>();

    /*
     * VX1 §21 — a trade object never leaves the viewport.
     *
     * `priceToCoordinate` happily returns a coordinate above the plot's top or
     * below its bottom: a Take Profit set outside the visible price band mapped
     * to a negative y and the chip rendered *behind the toolbar*, which is how a
     * trader ends up believing a level they set does not exist. The level is
     * pinned to the edge it left through instead, and says which way it went —
     * the price on it is unchanged, only where its chip is drawn.
     */
    const height = plotSize.height;
    const place = (id: string, price: string, itemHeight: number, into: typeof badgeInputs) => {
      const raw = series.priceToCoordinate(Number(price));
      if (raw === null) return;
      if (height <= 0) {
        into.push({ id, y: raw, height: itemHeight });
        return;
      }
      /*
       * Two different facts, deliberately not conflated.
       *
       * **Where the chip may sit** is a layout question: the top band belongs to
       * the OHLC and indicator legend, so a chip is placed below it even when
       * its line is up there — the line is still drawn at the true price, and a
       * chip through the legend would cost two readable things to save one.
       *
       * **Whether the level is off-screen** is a market question, and only that
       * earns the caret. A Take Profit sitting under the legend is visible and
       * says so; a Take Profit above the visible price band is not, and its chip
       * says which way to look.
       */
      const top = Math.max(OVERLAY_EDGE_PADDING, legendHeight + OVERLAY_EDGE_PADDING);
      const bottom = height - OVERLAY_EDGE_PADDING - (isDesktop ? 0 : MOBILE_FEEDBACK_LANE);
      /*
       * The caret marks *displacement*, not merely being off-plot.
       *
       * WX1 set it only when the price fell outside the canvas entirely, so a
       * chip clamped into the safe band — pinned under the legend, or lifted
       * out of the feedback lane — sat silently at a coordinate that was not
       * its price. That is the one thing a trade object may never do. Any chip
       * that had to move now says which way its level actually is.
       */
      const y = Math.min(Math.max(raw, top), bottom);
      if (raw < top) edge.set(id, 'above');
      else if (raw > bottom) edge.set(id, 'below');
      into.push({ id, y, height: itemHeight });
    };

    for (const position of positions) {
      place(`badge:${position.id}`, position.averageOpenPrice, 28, badgeInputs);
      if (position.stopLoss) place(`sl:${position.id}`, position.stopLoss, 28, levelInputs);
      if (position.takeProfit) place(`tp:${position.id}`, position.takeProfit, 28, levelInputs);
    }
    /*
     * VX1-B — one batch, not two.
     *
     * WX1 resolved badges and levels separately because they lived in different
     * columns: the position badge hugged the right edge, the SL/TP handles sat
     * beside it, and neither could cover the other. VX1 moved every trade object
     * into the same column on its own line, which made that separation a bug —
     * an entry a few ticks under a take profit rendered one chip through the
     * other. They now compete for the same vertical space, because they occupy
     * it.
     */
    for (const placement of resolveLabelCollisions([...badgeInputs, ...levelInputs])) {
      if (placement.id.startsWith('badge:')) badgeY.set(placement.id, placement.y);
      else levelY.set(placement.id, placement.y);
    }
    return { badgeY, levelY, edge };
    /*
     * `tick` is a dependency on purpose, and it is the only one that fires
     * often.
     *
     * The price scale can move without any of the others changing: autoscale
     * re-fits as new candles arrive, and dragging the price axis re-ranges it
     * with no time-scale event at all — the one signal this component listens to
     * for pan and zoom. Recomputing on the tick keeps every chip standing on its
     * own line within a frame of the market moving, instead of drifting off it
     * until something else happens to bump `chartVersion`.
     *
     * The cost is three `priceToCoordinate` calls and a sort per tick, against a
     * renderer that has just redrawn the whole plot.
     */
  }, [positions, spec, chartVersion, plotSize.height, legendHeight, isDesktop, tick]);

  // Appendix 07-D — same collision-aware Y placement as `overlay` above, but
  // resolved as its own independent batch: pending-order and alert lines are
  // unrelated to any specific position, so (matching this codebase's
  // existing choice not to cross-resolve badges against SL/TP handles
  // either) they don't compete for vertical space with position overlays,
  // only with each other.
  const pendingOverlay = useMemo(() => {
    const series = seriesRef.current;
    if (!series || !spec) return null;
    void chartVersion;

    const inputs: { id: string; y: number; height: number }[] = [];
    const placementY = new Map<string, number>();
    for (const order of pendingOrders) {
      const y = series.priceToCoordinate(Number(order.triggerPrice));
      if (y !== null) inputs.push({ id: `pending:${order.id}`, y, height: 22 });
    }
    for (const alert of alerts) {
      const y = series.priceToCoordinate(Number(alert.thresholdPrice));
      if (y !== null) inputs.push({ id: `alert:${alert.id}`, y, height: 22 });
    }
    for (const placement of resolveLabelCollisions(inputs)) {
      placementY.set(placement.id, placement.y);
    }
    return placementY;
  }, [pendingOrders, alerts, spec, chartVersion]);

  /*
   * VX1-D.1 §8 / VX1-D.1.1 §1 — is this drag heading somewhere a level of this
   * kind may live, and if not, what should be said about it?
   *
   * The rule is the domain's (`isProtectionLevelValid`), read against the
   * position's own authoritative entry — this file re-derives nothing and owns
   * no second risk engine. What it decides is presentation, and the preview
   * below depends on the answer: an invalid level is not a level with bad
   * numbers, it is not a level, so it is not given numbers at all.
   */
  const dragValidity = useMemo(() => {
    if (!drag) return null;
    const position = positions.find((candidate) => candidate.id === drag.positionId);
    if (!position) return null;
    const valid = isProtectionLevelValid({
      side: position.side,
      kind: drag.field,
      entryPrice: position.averageOpenPrice,
      levelPrice: drag.previewPrice,
    });
    if (valid) return { valid: true as const, reason: null };
    const mustSit =
      protectionPlacementFor(position.side, drag.field) === 'above_entry' ? 'au-dessus de' : 'sous';
    const name = drag.field === 'stop_loss' ? 'Stop Loss' : 'Take Profit';
    return {
      valid: false as const,
      reason: `Un ${name} doit être ${mustSit} l’entrée ${position.averageOpenPrice}.`,
    };
  }, [drag, positions]);

  /*
   * VX1-D.1.2 §1 — the validation card's own coordinate.
   *
   * Everything the card must not cover is already resolved by the time this
   * runs: the chips have their final Y from the overlay batch (pinned ones
   * included), while the current-price plate and the active preview label sit
   * on the scale at their own authoritative coordinates. They are handed to
   * the layout rule as occupied bands; it picks the half of the plot opposite
   * the drag and, failing that, the least covered position between the
   * boundaries.
   *
   * The card is the only thing that yields. No level, no chip and no plate is
   * moved to make room for an explanation.
   */
  const dragCardTop = useMemo(() => {
    if (!drag || plotSize.height <= 0) return legendHeight + 12;
    const occupied: OccupiedBand[] = [];
    const band = (y: number | undefined, height: number) => {
      if (y === undefined) return;
      occupied.push({ top: y - height / 2, bottom: y + height / 2 });
    };
    for (const position of positions) {
      band(overlay?.badgeY.get(`badge:${position.id}`), 28);
      band(overlay?.levelY.get(`sl:${position.id}`), 28);
      band(overlay?.levelY.get(`tp:${position.id}`), 28);
    }
    // The market's own plate, read from the same series the scale is drawn from.
    const series = seriesRef.current;
    const live = history.series().current;
    const last = live?.close ?? tick?.bid ?? null;
    if (series && last !== null) {
      const y = series.priceToCoordinate(Number(last));
      if (y !== null) band(y, 20);
    }
    // The native preview line and its `SL/TP (aperçu)` axis label never yield.
    // Reserve their real price coordinate and move only this explanatory card.
    if (series) {
      const y = series.priceToCoordinate(Number(drag.previewPrice));
      if (y !== null) band(y, 28);
    }
    return resolveDragCardTop({
      plotHeight: plotSize.height,
      legendHeight,
      // The same lane the chips are kept out of, so the card cannot drift into
      // the feedback zone either.
      bottomReserved: isDesktop
        ? OVERLAY_EDGE_PADDING
        : OVERLAY_EDGE_PADDING + MOBILE_FEEDBACK_LANE,
      cardHeight: DRAG_CARD_HEIGHT,
      dragDirection:
        drag.pointerY !== undefined && drag.pointerY < drag.startClientY ? 'up' : 'down',
      occupied,
    });
    // `tick` keeps the current-price band fresh while the market moves under a
    // held pointer, which is precisely when a card can drift onto the plate.
  }, [drag, positions, overlay, plotSize.height, legendHeight, isDesktop, history, tick]);

  const dragPreviewCard = useMemo(() => {
    if (!drag || !spec) return null;
    const position = positions.find((p) => p.id === drag.positionId);
    if (!position) return null;
    const reference = referencePriceFor(position);
    if (!reference) return null;

    /*
     * VX1-D.1.1 §1 — an invalid level gets no economics at all.
     *
     * The projected P&L, the share of equity, the risk/reward and the daily
     * budget after execution are all answers to "what happens if this level
     * fills". A stop above a long's entry cannot fill as a stop, so every one
     * of those figures would be describing an order that does not exist — and
     * the worst of them is the money, which for an invalid stop comes out
     * *positive*: a Stop Loss showing a profit. The card therefore states the
     * price, names the problem, and stops.
     */
    if (dragValidity && !dragValidity.valid) {
      return {
        kind: drag.field,
        priceFormatted: drag.previewPrice,
        distancePointsFormatted: null,
        pnlFormatted: null,
        percentOfAccountFormatted: null,
        riskRewardFormatted: null,
        dailyLossRemainingAfterFormatted: null,
        invalidReason: dragValidity.reason,
      };
    }

    const preview = computeLevelPnlPreview({
      levelPrice: drag.previewPrice,
      referencePrice: reference,
      positionSide: position.side,
      quantity: position.openQuantity,
      contractSize: spec.contractSize,
      pricePrecision: spec.pricePrecision,
      accountEquity,
    });
    const riskReward =
      drag.field === 'take_profit'
        ? computeRiskRewardRatio({
            stopLossPrice: position.stopLoss,
            takeProfitPrice: drag.previewPrice,
            referencePrice: reference,
          })
        : computeRiskRewardRatio({
            stopLossPrice: drag.previewPrice,
            takeProfitPrice: position.takeProfit,
            referencePrice: reference,
          });
    const sign = Number(preview.estimatedPnl) >= 0 ? '+' : '';
    return {
      kind: drag.field,
      priceFormatted: preview.levelPrice,
      distancePointsFormatted: preview.distancePoints,
      pnlFormatted: `${sign}${preview.estimatedPnl} USD`,
      percentOfAccountFormatted: preview.percentOfAccountEquity,
      riskRewardFormatted: riskReward,
      dailyLossRemainingAfterFormatted:
        drag.field === 'stop_loss' && dailyLossRemaining ? `${dailyLossRemaining} USD` : null,
      invalidReason: null,
    };
  }, [drag, dragValidity, positions, spec, accountEquity, dailyLossRemaining, tick]);

  const overlayLabel = useMemo(() => {
    if (isDisconnected)
      return connectionState === 'resyncing' ? 'Resynchronisation…' : 'Reconnexion…';
    if (isStale) return 'Prix obsolète';
    return null;
  }, [isDisconnected, isStale, connectionState]);

  const syncStateFor = (positionId: string, field: RiskLevelField): LevelSyncState => {
    if (drag && drag.positionId === positionId && drag.field === field) {
      return dragValidity && !dragValidity.valid ? 'invalid_zone' : 'dragging_preview';
    }
    if (
      pendingRiskAction &&
      pendingRiskAction.positionId === positionId &&
      pendingRiskAction.field === field
    ) {
      return 'pending_server';
    }
    if (draggingDisabled) return 'stale_disabled';
    return 'confirmed';
  };

  const orderSyncStateFor = (kind: OrderDragSession['kind'], id: string): LevelSyncState => {
    if (orderDrag && orderDrag.kind === kind && orderDrag.id === id) return 'dragging_preview';
    if (rejectedOrderAction && rejectedOrderAction.kind === kind && rejectedOrderAction.id === id) {
      return 'rejected';
    }
    if (pendingOrderAction && pendingOrderAction.kind === kind && pendingOrderAction.id === id) {
      return 'pending_server';
    }
    if (draggingDisabled) return 'stale_disabled';
    return 'confirmed';
  };

  // The context menu's position-scoped actions (Add/Move SL/TP, partial
  // close, close) target the first open position on this symbol — WariX's
  // hedging model allows several concurrent positions per symbol, and a
  // single "current position" menu can't disambiguate between them by
  // clicked price alone. Managing a *specific* one among several stays
  // available through that position's own badge (Gérer/Fermer), which is
  // already per-position.
  const currentPosition = positions[0] ?? null;

  const closeContextMenu = () => setContextMenu(null);
  /*
   * The clicked price, read at click time rather than closed over.
   *
   * `contextChartActions` is memoised so the menu's identity is stable; without
   * this ref, Copy price would have captured whichever price the menu was opened
   * at when the memo was last built, and copied that one forever.
   */
  const contextMenuPriceRef = useRef<string | null>(null);
  contextMenuPriceRef.current = contextMenu?.price ?? null;

  // Read at render time rather than mirrored into state: this component already
  // re-renders on every accepted tick (the `tick` prop), so the count is fresh
  // without a second subscription, and no extra render is caused by history.
  const historySeries = history.series();
  const historyCandleCount = historySeries.finalized.length;
  const historyNewestBucket = historySeries.finalized.at(-1)?.startTime ?? '';
  const historyFirstBucket = historySeries.finalized[0]?.startTime ?? null;
  const historyLastBucket =
    historySeries.current?.startTime ?? historySeries.finalized.at(-1)?.startTime ?? null;
  const historyCoverageSeconds =
    historyFirstBucket !== null && historyLastBucket !== null
      ? Math.max(0, historyLastBucket - historyFirstBucket)
      : 0;
  /*
   * VX1-C §5/§6 — the plot always says why it is empty.
   *
   * `idle` means the history controller has not started, which happens exactly
   * while the transport is still coming up. WX1 rendered nothing there, so a
   * trader on a slow link watched a blank chart with no explanation. The
   * connection sentence covers that gap and disappears the moment history takes
   * over — and neither claims data that has not arrived.
   */
  const connectingWithoutHistory =
    connectionState !== 'open' && historyCandleCount === 0 && historyState.status !== 'error';
  const historyMessage =
    historyState.status === 'idle' || historyState.status === 'ready'
      ? connectingWithoutHistory
        ? HISTORY_CONNECTING_MESSAGE
        : null
      : HISTORY_STATUS_MESSAGE[historyState.status];
  /*
   * VX1-C.1 §4 — the chart states its connection once.
   *
   * Both notices were correct and both fired together: the veil said
   * "Reconnexion…" across the plot while the chip in the corner said "Connexion
   * au flux…", for one interrupted socket. They answer different questions, so
   * neither is deleted — each simply keeps the case it is the better answer to.
   *
   * The veil's job is to disown *candles that are already drawn*: it dims a plot
   * a trader can see and tells them it is frozen. With an empty plot there is
   * nothing to disown, and a full-bleed grey wash over blank canvas says less
   * than the quiet chip does. So an empty chart speaks through the chip alone,
   * and a populated one through the veil alone — one sentence either way.
   */
  const plotOverlayLabel = connectingWithoutHistory ? null : overlayLabel;
  /*
   * §14 — the bar's own change, from the two candles the chart is already
   * holding.
   *
   * The comparison bar is the one *before* whichever candle the status line is
   * showing: hovering bar N must report N against N-1, not the live bar against
   * its predecessor. Both come from the same finalized series the plot renders,
   * so the number on screen is always derived from the bars on screen.
   */
  const statusCandle = legendCandle(history, hoveredCandle);
  /**
   * The plates WariX draws on the price scale (VX1-A.1 §1).
   *
   * Every entry here is a price that already exists on the chart as a line: the
   * three trade levels, and the market's own last traded price. Nothing is
   * computed — the strings are the canonical values, formatted at the
   * instrument's precision — and the layout decision (who yields to whom) lives
   * in `chart-price-plate-layout`, away from any of this.
   */
  const pricePlates = useMemo<PriceScalePlate[]>(() => {
    const series = seriesRef.current;
    if (!series || !spec) return [];
    void chartVersion;
    const plates: PriceScalePlate[] = [];
    const push = (id: string, kind: PriceScalePlate['kind'], price: string) => {
      const y = series.priceToCoordinate(Number(price));
      if (y === null) return;
      if (plotSize.height > 0 && (y < 0 || y > plotSize.height)) return;
      plates.push({ id, kind, priceFormatted: formatPlatePrice(price, pricePrecision), y });
    };
    for (const position of positions) {
      push(`plate:entry:${position.id}`, 'entry', position.averageOpenPrice);
      if (position.stopLoss) push(`plate:sl:${position.id}`, 'stop_loss', position.stopLoss);
      if (position.takeProfit) push(`plate:tp:${position.id}`, 'take_profit', position.takeProfit);
    }
    // The *live* close, never the hovered candle: this plate reports where the
    // market is, and it must not follow a crosshair down the chart.
    const live = history.series().current;
    const last = live?.close ?? tick?.bid ?? null;
    if (last !== null && chartSettings.scales.currentPriceLine) {
      push('plate:current', 'current', last);
    }
    return plates;
  }, [
    positions,
    spec,
    chartVersion,
    plotSize.height,
    pricePrecision,
    tick,
    history,
    chartSettings.scales.currentPriceLine,
  ]);

  const barChange = useMemo(() => {
    if (statusCandle === null) return null;
    const { finalized, current } = history.series();
    const series = current === null ? finalized : [...finalized, current];
    const index = series.findIndex((candle) => candle.startTime === statusCandle.startTime);
    const previous = index > 0 ? series[index - 1] : null;
    return computeBarChange(statusCandle, previous?.close ?? null, pricePrecision);
  }, [statusCandle, history, pricePrecision, chartVersion]);

  /*
   * §17 — fit the visible range, and nothing else.
   *
   * `fitContent` touches the time scale only: no drawing is deleted, no
   * indicator is reset, no interval changes and no command is sent. It is
   * deliberately the narrowest implementation available, because the wider ones
   * (clearing and refetching history to "reset") would cross into W3's
   * territory for a cosmetic action.
   */
  const fitChart = useCallback(() => chartRef.current?.timeScale().fitContent(), []);

  const zoomIn = useCallback(() => {
    const scale = chartRef.current?.timeScale();
    const range = scale?.getVisibleLogicalRange();
    if (!scale || !range) return;
    const center = (range.from + range.to) / 2;
    const half = ((range.to - range.from) * 0.78) / 2;
    scale.setVisibleLogicalRange({ from: center - half, to: center + half });
  }, []);

  const selectHorizon = useCallback(
    (seconds: number) => {
      const chart = chartRef.current;
      if (!chart) return;
      const series = history.series();
      const oldest = series.finalized[0]?.startTime;
      const newest = series.current?.startTime ?? series.finalized.at(-1)?.startTime;
      if (oldest === undefined || newest === undefined) return;
      const from = newest - seconds;
      // A visible, disabled horizon is more honest than manufacturing empty
      // time before the process-memory window WariX actually has.
      if (oldest > from) return;
      chart.timeScale().setVisibleRange({
        from: from as UTCTimestamp,
        to: newest as UTCTimestamp,
      });
    },
    [history],
  );

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const mode =
      scaleMode === 'percentage'
        ? PriceScaleMode.Percentage
        : scaleMode === 'logarithmic'
          ? PriceScaleMode.Logarithmic
          : PriceScaleMode.Normal;
    chart.priceScale('right').applyOptions({ mode, autoScale });
    chart.priceScale('left').applyOptions({ mode, autoScale });
  }, [scaleMode, autoScale]);

  /** §20 — a PNG of exactly what is on screen, from the renderer's own export. */
  const takeSnapshot = useCallback(() => {
    const canvas = chartRef.current?.takeScreenshot();
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `wariX-${symbol}-${analysis.timeframe}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [symbol, analysis.timeframe]);

  const toggleMagnet = useCallback(() => {
    analysis.applySettings({
      ...analysis.settings,
      canvas: {
        ...analysis.settings.canvas,
        crosshairMagnet: !analysis.settings.canvas.crosshairMagnet,
      },
    });
  }, [analysis.applySettings, analysis.settings]);

  /**
   * §18 — copy the clicked price at the instrument's own precision.
   *
   * The value copied is the same string the menu displayed, which is the same
   * string the overlay and the price scale render: a trader who pastes it into
   * the Execution Center's trigger field gets a price the validator accepts,
   * not a float with fifteen decimals.
   */
  const copyPrice = useCallback((price: string) => {
    void navigator.clipboard
      ?.writeText(price)
      .then(() => setCopiedPrice(price))
      .catch(() => {
        // Clipboard denied (permissions, insecure origin). Nothing to recover:
        // the menu closes either way and no state claims a copy happened.
      });
  }, []);

  const copyChartLink = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('symbol', symbol);
    void navigator.clipboard
      ?.writeText(url.toString())
      .then(() => setChartLinkCopied(true))
      .catch(() => setChartLinkCopied(false));
  }, [symbol]);

  useEffect(() => {
    if (!chartLinkCopied) return;
    const timer = setTimeout(() => setChartLinkCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [chartLinkCopied]);

  useEffect(() => {
    if (copiedPrice === null) return;
    const timer = setTimeout(() => setCopiedPrice(null), 1600);
    return () => clearTimeout(timer);
  }, [copiedPrice]);

  /**
   * §20 — Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z, over drawings.
   *
   * Ignored while focus is in a text field, so undo in the Execution Center's
   * quantity input stays the browser's own undo and never silently removes a
   * trend line the trader cannot see from there.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      event.preventDefault();
      if (event.shiftKey) analysis.redo();
      else analysis.undo();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [analysis]);

  /**
   * The chart-side context-menu actions, built once and shared.
   *
   * The desktop popover and the mobile long-press sheet render the same
   * component, so they must be handed the same behaviour — passing these twice
   * by hand is exactly how the two presentations drift apart.
   */
  const contextChartActions = {
    onResetView: () => {
      closeContextMenu();
      chartRef.current?.timeScale().fitContent();
    },
    onCopyPrice: () => {
      const price = contextMenuPriceRef.current;
      closeContextMenu();
      if (price !== null) copyPrice(price);
    },
    onOpenSettings: () => {
      closeContextMenu();
      setSettingsOpen(true);
    },
    onOpenObjectTree: () => {
      closeContextMenu();
      setObjectTreeOpen(true);
    },
    onToggleMagnet: () => {
      closeContextMenu();
      toggleMagnet();
    },
    magnet: analysis.settings.canvas.crosshairMagnet,
    onRemoveDrawings: () => {
      closeContextMenu();
      analysis.removeAllDrawings();
    },
    drawingCount: analysis.drawings.length,
    onRemoveIndicators: () => {
      closeContextMenu();
      analysis.disableAllIndicators();
    },
    indicatorCount: analysis.legend.length,
    onToggleDrawingsHidden: () => {
      closeContextMenu();
      analysis.setDrawingsHidden(!analysis.drawingsHidden);
    },
    onToggleIndicatorsHidden: () => {
      closeContextMenu();
      analysis.setIndicatorsHidden(!analysis.indicatorsHidden);
    },
    drawingsHidden: analysis.drawingsHidden,
    indicatorsHidden: analysis.indicatorsHidden,
  };

  return (
    // W1 §9 — min-h-0 at every ownership boundary: without it a flex child
    // refuses to shrink below its content, and the chart column would push
    // the workstation grid past the viewport instead of taking what is left.
    <div
      ref={chartColumnRef}
      className="flex min-h-0 flex-1 flex-col bg-[color:var(--wariba-chart-background)]"
    >
      {/* W5 §61/§62 — one compact analytical strip. Timeframes are always
          directly reachable; on a phone the indicator and drawing controls
          collapse into a single "Outils" sheet so the strip cannot push the
          document sideways at 320 px (§66/§67). */}
      {/* VX1-B §3/§4 — the toolbar is a raised module with its own top rim light
          and a hairline seam onto the plot, so the chart reads as sitting *in*
          the workstation rather than beside a bar. */}
      <div className="flex h-11 min-w-0 shrink-0 items-center border-b border-[color:var(--wariba-component-workstation-seam-hairline)] bg-[color:var(--wariba-component-workstation-surface-raised-module)] px-1 shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light)] min-[360px]:px-2 lg:h-[var(--wariba-component-workstation-toolbar-height)] lg:px-2">
        <ChartToolbar
          symbol={symbol}
          marketStatus={tick?.marketStatus ?? null}
          onOpenMarkets={
            isDesktop ? onOpenSymbolSearch : (onOpenMobileMarkets ?? onOpenSymbolSearch)
          }
          timeframe={analysis.timeframe}
          onSelectTimeframe={analysis.selectTimeframe}
          chartStyle={chartStyle}
          onSelectChartStyle={setChartStyle}
          onOpenIndicators={openIndicators}
          /* Active means the library is the current transient surface. Enabled
             studies are already visible in the status line and must not turn
             this navigation control into a permanent primary CTA. */
          indicatorsActive={indicatorsOpen}
          onOpenSettings={openSettings}
          onOpenAlerts={onOpenAlerts}
          onOpenTools={openChartTools}
          drawingToolActive={analysis.drawingModeActive}
          onResetView={fitChart}
          onSnapshot={takeSnapshot}
          onToggleFullscreen={toggleFullscreen}
          fullscreen={fullscreen}
          onUndo={analysis.undo}
          onRedo={analysis.redo}
          canUndo={analysis.canUndo}
          canRedo={analysis.canRedo}
          compact={!isDesktop}
        />
      </div>
      {/* The overlays below are absolutely positioned against this box, and
          the chart container fills it exactly (inset-0), so every
          priceToCoordinate/timeToCoordinate value stays measured from the
          same origin it was before the container started owning its height. */}
      <div className="flex min-h-0 min-w-0 flex-1">
        {isDesktop ? (
          <DrawingToolRail
            tool={analysis.tool}
            onSelect={analysis.selectTool}
            cursorMode={analysis.cursorMode}
            onSelectCursorMode={analysis.selectCursorMode}
            favorites={analysis.favorites}
            onToggleFavorite={analysis.toggleFavorite}
            magnet={analysis.settings.canvas.crosshairMagnet}
            onToggleMagnet={toggleMagnet}
            keepDrawingMode={analysis.keepDrawingMode}
            onToggleKeepDrawingMode={analysis.toggleKeepDrawingMode}
            drawingsLocked={analysis.drawingsLocked}
            onToggleDrawingsLocked={analysis.toggleDrawingsLocked}
            onZoomIn={zoomIn}
            chartLinkCopied={chartLinkCopied}
            onCopyChartLink={copyChartLink}
            drawingsHidden={analysis.drawingsHidden}
            indicatorsHidden={analysis.indicatorsHidden}
            onSetDrawingsHidden={analysis.setDrawingsHidden}
            onSetIndicatorsHidden={analysis.setIndicatorsHidden}
            drawingCount={analysis.drawings.length}
            onRemoveAllDrawings={analysis.removeAllDrawings}
            onOpenObjectTree={openObjectTree}
          />
        ) : null}
        <div className="relative min-h-0 min-w-0 flex-1">
          <div
            ref={containerRef}
            /**
             * `isolate` is load-bearing, not decoration.
             *
             * lightweight-charts puts `z-index: 1` on its canvas. Because nothing
             * between that canvas and this column created a stacking context, the
             * `1` competed directly with every sibling overlay's `z-index: auto`
             * — and won. The drawing layer was painting *underneath the chart*:
             * the geometry was correct, the strokes were correct, and none of it
             * was ever visible. Trading overlays were one CSS change away from the
             * same fate.
             *
             * `isolation: isolate` makes this container a stacking context, so the
             * library's z-index stays the library's business and painting order
             * among the siblings below is decided by DOM order again — which is
             * exactly what §57's hierarchy is written against: drawing layer
             * first, trading overlays after, so operational controls stay on top.
             */
            className="absolute inset-0 isolate"
            role="group"
            aria-label={`Graphique ${symbol}`}
            // Visual closure §6 — the precision the renderer was actually given.
            // lightweight-charts draws its labels into a canvas, so no test can
            // read "1.08504" back off the price scale; this exposes the one
            // input that decides it, and `chart-price-format.test.ts` proves that
            // input produces the right label. Together the chain is complete.
            data-price-precision={pricePrecision ?? undefined}
            // W5 §131 — the active tool, exposed for evidence and tests. It is
            // chart-local state and appears nowhere in a global context.
            data-chart-tool={analysis.tool}
            data-chart-cursor={analysis.cursorMode}
            data-drawing-count={analysis.projected.length}
            data-history-has-more-older={String(historyState.hasMoreOlder)}
            onContextMenuCapture={handleContextMenuEvent}
            onPointerDownCapture={handleContainerPointerDown}
            onPointerMoveCapture={handleContainerPointerMove}
            onPointerUpCapture={handleContainerPointerUp}
            onPointerCancelCapture={handleContainerPointerUp}
            onPointerLeave={() => {
              if (cursorDotRef.current) cursorDotRef.current.style.display = 'none';
            }}
            style={{
              cursor:
                analysis.cursorMode === 'dot'
                  ? 'none'
                  : analysis.cursorMode === 'arrow'
                    ? 'default'
                    : analysis.cursorMode === 'eraser'
                      ? 'cell'
                      : 'crosshair',
            }}
          />
          <span
            ref={cursorDotRef}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 z-30 hidden h-2 w-2 rounded-full border border-[color:var(--wariba-chart-background)] bg-[color:var(--wariba-chart-crosshair)] shadow-[0_0_0_1px_var(--wariba-chart-crosshair)]"
          />
          {/* W5 §45 — the analytical drawing layer sits *below* every trading
            overlay in DOM order and never takes a pointer event, so a Fibonacci
            grid can neither cover an open position's badge nor swallow the drag
            that moves a stop loss (§57/§110/§127). */}
          <ChartDrawingLayer
            projected={analysis.projected}
            selectedId={analysis.selectedId}
            draft={analysis.projectedDraft}
            width={plotSize.width}
            height={plotSize.height}
          />
          {/* VX1-A.1 §1 — WariX's own price plates, laid out by priority over
              the library's scale. Above the drawing layer, below the trade
              chips: a plate is read, never pressed. */}
          <ChartPriceScalePlates
            plates={pricePlates}
            width={priceScaleWidth}
            height={plotSize.height}
            compact={!isDesktop}
          />
          <ChartStatusLine
            symbol={symbol}
            timeframe={analysis.timeframe}
            marketStatus={tick?.marketStatus ?? null}
            candle={statusCandle}
            pricePrecision={pricePrecision}
            change={barChange}
            indicators={analysis.legend}
            settings={chartSettings.statusLine}
            compact={!isDesktop}
            indicatorsHidden={analysis.indicatorsHidden}
          />
          {/* W3 §52-§55 — chart-local, subtle, and never covering the price or an
            execution control: pointer-events-none so it cannot intercept a
            crosshair, a drag or a long press. One restrained polite status
            region for the whole history lifecycle, so a transition is announced
            once and individual candles never are (§75).

            The data-* attributes are W3 §86's deterministic evidence anchors.
            The epoch is the opaque process-memory generation already carried in
            the response (it holds no infrastructure detail), and it is what
            makes "the same process memory survived this browser reload"
            provable rather than asserted; the newest finalized bucket pins
            *which* observed history is on screen. */}
          <div
            data-testid="chart-history-status"
            data-history-status={historyState.status}
            data-history-candles={historyCandleCount}
            data-history-epoch={historyState.sourceEpoch ?? ''}
            data-history-newest={historyNewestBucket}
            // W5 §135 — moved to the bottom edge now that the OHLC/indicator
            // legend owns the top-left corner, so a history error and the legend
            // never stack into a block that hides the chart on a 390 px screen.
            className="pointer-events-none absolute bottom-2 left-2 z-10"
          >
            {historyMessage && (
              /*
               * VX1-B §34 — a status chip, not a line of developer text.
               *
               * The same compact graphite surface the rest of the workstation
               * uses, with a small pulsing mark while history is actually in
               * flight. No spinner and no skeleton over the plot: the chart is
               * already drawing live candles behind this, and the only missing
               * thing is depth.
               */
              <span
                role="status"
                aria-live="polite"
                data-history-message={historyState.status}
                className="flex items-center gap-1.5 rounded-[var(--wariba-component-workstation-radius-control)] border border-[color:var(--wariba-component-workstation-seam-hairline)] bg-[color:var(--wariba-component-workstation-surface-popover)]/92 px-2 py-1 text-[length:var(--wariba-component-workstation-type-label)] font-semibold text-[color:var(--wariba-component-workstation-text-secondary)] shadow-[var(--wariba-component-workstation-elevation-key)]"
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    historyState.status === 'error'
                      ? 'bg-[color:var(--wariba-component-workstation-trading-sell)]'
                      : historyState.status === 'loading'
                        ? 'bg-[color:var(--wariba-component-workstation-market-current)] motion-safe:animate-pulse'
                        : 'bg-[color:var(--wariba-component-workstation-text-tertiary)]'
                  }`}
                />
                {historyMessage}
              </span>
            )}
          </div>
          {overlay &&
            positions.map((position) => {
              const y = overlay.badgeY.get(`badge:${position.id}`);
              if (y === undefined) return null;
              const reference = referencePriceFor(position);
              const pnl = reference
                ? computeRealizedPnl({
                    openPrice: position.averageOpenPrice,
                    closePrice: reference,
                    quantity: position.openQuantity,
                    contractSize: spec?.contractSize ?? '1',
                    positionSide: position.side,
                  })
                : null;
              return (
                <PositionChip
                  key={position.id}
                  y={y}
                  side={position.side}
                  quantityFormatted={formatLotSize(position.openQuantity)}
                  // VX1 §12/§16 — the money, in the currency the account is
                  // denominated in, computed exactly as it was before by
                  // `computeRealizedPnl` against the canonical reference price.
                  pnlFormatted={pnl !== null ? formatMoney(pnl) : '—'}
                  pnlTone={
                    pnl === null
                      ? 'neutral'
                      : Number(pnl) > 0
                        ? 'positive'
                        : Number(pnl) < 0
                          ? 'negative'
                          : 'neutral'
                  }
                  syncState={draggingDisabled ? 'stale_disabled' : 'confirmed'}
                  syncLabel={overlayLabel}
                  edge={overlay.edge.get(`badge:${position.id}`) ?? null}
                  entryPriceFormatted={position.averageOpenPrice}
                  symbol={position.symbol}
                  onManage={() => onOpenManage(position.id)}
                  onClose={() => onClosePosition(position.id)}
                  closeDisabled={commandPending}
                  showCloseButton
                  compact={!isDesktop}
                />
              );
            })}
          {overlay &&
            positions.map((position) => {
              const reference = referencePriceFor(position);
              const chips: React.ReactNode[] = [];
              /*
               * VX1-D.1 §5 — a level, or an action, never a mixture.
               *
               * A field that *has* a price gets a real level chip whose Y comes
               * from `priceToCoordinate`, so a long's take profit lands above
               * its entry because its price is above it — never because of the
               * order this loop happens to run in. A field with no price gets
               * no chip at all: both missing fields are collected and offered
               * once, as the action cluster below.
               */
              const missing: RiskLevelField[] = [];
              (['stop_loss', 'take_profit'] as const).forEach((field) => {
                const value = field === 'stop_loss' ? position.stopLoss : position.takeProfit;
                const levelKey = field === 'stop_loss' ? `sl:${position.id}` : `tp:${position.id}`;
                if (value) {
                  const y = overlay.levelY.get(levelKey);
                  if (y === undefined || !spec || !reference) return;
                  const preview = computeLevelPnlPreview({
                    levelPrice: value,
                    referencePrice: reference,
                    positionSide: position.side,
                    quantity: position.openQuantity,
                    contractSize: spec.contractSize,
                    pricePrecision: spec.pricePrecision,
                    accountEquity,
                  });
                  chips.push(
                    <TradeLevelChip
                      key={levelKey}
                      y={y}
                      kind={field}
                      priceFormatted={value}
                      // The same `computeLevelPnlPreview` estimate WX1 showed —
                      // only its presentation moved to the front of the chip.
                      pnlFormatted={formatMoney(preview.estimatedPnl)}
                      quantityFormatted={formatLotSize(position.openQuantity)}
                      syncState={syncStateFor(position.id, field)}
                      edge={overlay.edge.get(levelKey) ?? null}
                      disabled={draggingDisabled}
                      onPointerDown={startDrag(position.id, field, value)}
                      onActivate={() => onOpenManage(position.id)}
                      onRemove={() =>
                        onCommitLevel({ positionId: position.id, field, value: null })
                      }
                      compact={!isDesktop}
                      onKeyboardAdjust={(direction) => {
                        if (!spec) return;
                        const point = Number(`1e-${spec.pricePrecision}`);
                        const next = roundPriceToTick({
                          price: String(Number(value) + direction * point),
                          pricePrecision: spec.pricePrecision,
                        });
                        onCommitLevel({ positionId: position.id, field, value: next });
                      }}
                    />,
                  );
                } else {
                  missing.push(field);
                }
              });

              if (missing.length > 0 && reference) {
                const badgeY = overlay.badgeY.get(`badge:${position.id}`);
                if (badgeY !== undefined) {
                  chips.push(
                    <PositionProtectionControls
                      key={`protect:${position.id}`}
                      y={badgeY + (isDesktop ? 26 : 24)}
                      disabled={draggingDisabled}
                      disabledReason={
                        isStale
                          ? 'Prix obsolète — indisponible tant que le marché n’est pas à jour.'
                          : null
                      }
                      onStopPointerDown={startDrag(position.id, 'stop_loss', reference)}
                      onTargetPointerDown={startDrag(position.id, 'take_profit', reference)}
                      onActivate={() => onOpenManage(position.id)}
                      compact={!isDesktop}
                    />,
                  );
                }
              }
              return chips;
            })}
          {pendingOverlay &&
            spec &&
            tick &&
            pendingOrders.map((order) => {
              const y = pendingOverlay.get(`pending:${order.id}`);
              if (y === undefined) return null;
              const mid = ((Number(tick.bid) + Number(tick.ask)) / 2).toFixed(spec.pricePrecision);
              return (
                <PendingOrderLine
                  key={order.id}
                  y={y}
                  orderType={order.orderType}
                  quantityFormatted={order.quantity}
                  priceFormatted={order.triggerPrice}
                  distancePointsFormatted={pendingOrderDistancePoints({
                    triggerPrice: order.triggerPrice,
                    referencePrice: mid,
                    pricePrecision: spec.pricePrecision,
                  })}
                  syncState={orderSyncStateFor('pending_order', order.id)}
                  disabled={draggingDisabled}
                  onPointerDown={startOrderDrag('pending_order', order.id, order.triggerPrice)}
                  onActivate={() => onOpenManagePendingOrder(order.id)}
                  onRemove={() => onCancelPendingOrder(order.id)}
                  onKeyboardAdjust={(direction) => {
                    const point = Number(`1e-${spec.pricePrecision}`);
                    const next = roundPriceToTick({
                      price: String(Number(order.triggerPrice) + direction * point),
                      pricePrecision: spec.pricePrecision,
                    });
                    onModifyPendingOrderTrigger({ pendingOrderId: order.id, triggerPrice: next });
                  }}
                />
              );
            })}
          {pendingOverlay &&
            spec &&
            alerts.map((alert) => {
              const y = pendingOverlay.get(`alert:${alert.id}`);
              if (y === undefined) return null;
              return (
                <AlertLine
                  key={alert.id}
                  y={y}
                  direction={alert.direction}
                  priceFormatted={alert.thresholdPrice}
                  syncState={orderSyncStateFor('alert', alert.id)}
                  disabled={draggingDisabled}
                  onPointerDown={startOrderDrag('alert', alert.id, alert.thresholdPrice)}
                  onActivate={() => onOpenManageAlert(alert.id)}
                  onRemove={() => onDeleteAlert(alert.id)}
                  onKeyboardAdjust={(direction) => {
                    const point = Number(`1e-${spec.pricePrecision}`);
                    const next = roundPriceToTick({
                      price: String(Number(alert.thresholdPrice) + direction * point),
                      pricePrecision: spec.pricePrecision,
                    });
                    onModifyAlertThreshold({ alertId: alert.id, thresholdPrice: next });
                  }}
                />
              );
            })}
          {dragPreviewCard && (
            <DragPreviewPanel {...dragPreviewCard} top={dragCardTop} compact={!isDesktop} />
          )}
          {/* W5 §68 — while a tool is held, say so subtly and give the trader an
            explicit way out. Escape does the same thing from the keyboard
            (§89/§112); this is the touch equivalent, because a phone has none. */}
          {analysis.drawingModeActive && (
            <div
              data-testid="chart-active-tool"
              className="absolute right-2 top-2 z-20 flex items-center gap-2 rounded-[8px] bg-[color:var(--wariba-component-workstation-surface-popover)]/95 py-1 pl-2.5 pr-1 text-[length:var(--wariba-component-workstation-type-label)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-border-selected)] shadow-[var(--wariba-component-workstation-elevation-popover)]"
            >
              <span className="font-semibold uppercase tracking-[var(--wariba-component-workstation-tracking-label)] text-[color:var(--wariba-component-workstation-interaction-selected-text)]">
                {analysis.tool === 'select'
                  ? cursorModeLabel(analysis.cursorMode)
                  : toolLabel(analysis.tool)}
              </span>
              <button
                type="button"
                onClick={() => {
                  analysis.selectTool('select');
                  analysis.selectCursorMode('cross');
                }}
                className="min-h-11 rounded-[6px] px-2 font-semibold uppercase tracking-[var(--wariba-component-workstation-tracking-label)] text-[color:var(--wariba-component-workstation-text-secondary)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)] lg:min-h-7"
              >
                Annuler
              </button>
            </div>
          )}
          {/* W5 §52/§69 — the selected drawing's own actions. Deliberately no Buy,
            no Sell and no order control anywhere near it: a drawing UI must not
            be one mis-tap away from submitting a trade. Deleting here removes a
            drawing and nothing else — drawing ids and trading overlay ids are
            separate namespaces (§113). */}
          {analysis.selectedDrawing && (
            /*
             * Visual closure §19 — chart-native, and out of the price scale.
             *
             * WX1 pinned this to `bottom-2 right-2`, which is exactly where
             * lightweight-charts draws the right price scale and the last
             * price/bid/ask labels: the control for the drawing you just made
             * covered the numbers you made it against. It is now centred above
             * the time axis — clear of the price scale on the right, clear of
             * the OHLC legend at the top left, clear of the history chip at the
             * bottom left, and on the opposite side of the workstation from
             * every trading action, which §19 requires. The enclosure takes the
             * selected drawing's own aqua so the bar and the drawing it acts on
             * read as one object.
             */
            <div
              data-testid="chart-drawing-actions"
              className="absolute bottom-9 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-[10px] border border-[color:var(--wariba-component-workstation-analytics-selected-drawing)]/45 bg-[color:var(--wariba-component-workstation-surface-popover)]/95 p-1 text-[length:var(--wariba-component-workstation-type-label)] shadow-[var(--wariba-component-workstation-elevation-popover)]"
            >
              <span className="whitespace-nowrap border-r border-[color:var(--wariba-component-workstation-border-hairline)] px-2 font-semibold uppercase tracking-[var(--wariba-component-workstation-tracking-label)] text-[color:var(--wariba-component-workstation-analytics-selected-drawing)]">
                {drawingTypeLabel(analysis.selectedDrawing.type)}
              </span>
              <ToolbarButton
                label="Style"
                icon={<WariXPaletteIcon />}
                showLabel
                labelClassName="hidden min-[430px]:inline"
                onClick={analysis.cycleSelectedColor}
                className="h-11 px-2 lg:h-8"
              />
              <ToolbarButton
                label="Supprimer"
                icon={<WariXDeleteIcon />}
                showLabel
                labelClassName="hidden min-[430px]:inline"
                data-testid="chart-drawing-delete"
                onClick={analysis.deleteSelected}
                className="h-11 px-2 text-[color:var(--wariba-component-workstation-trading-rejection)] hover:bg-[color:var(--wariba-component-workstation-wash-sell)] hover:text-[color:var(--wariba-component-workstation-trading-rejection)] lg:h-8"
              />
              <ToolbarButton
                label="Terminé"
                icon={<WariXDoneIcon />}
                onClick={analysis.clearSelection}
                className="h-11 min-w-11 px-2 lg:h-8 lg:min-w-8"
              />
            </div>
          )}
          {contextMenu && !contextMenu.isTouchOrigin && (
            <ChartContextMenuPopover
              {...contextChartActions}
              x={contextMenu.x}
              y={contextMenu.y}
              onDismiss={closeContextMenu}
              clickedPriceFormatted={contextMenu.price}
              position={currentPosition}
              tick={tick}
              disabled={draggingDisabled}
              disabledReason={
                isStale
                  ? 'Prix obsolète — actions indisponibles tant que le marché n’est pas à jour.'
                  : isDisconnected
                    ? 'Connexion au serveur en cours…'
                    : null
              }
              onMarketBuy={() => {
                closeContextMenu();
                onMarketOrderRequest('buy');
              }}
              onMarketSell={() => {
                closeContextMenu();
                onMarketOrderRequest('sell');
              }}
              onManageStopLoss={() => {
                closeContextMenu();
                if (currentPosition) onOpenManage(currentPosition.id);
              }}
              onManageTakeProfit={() => {
                closeContextMenu();
                if (currentPosition) onOpenManage(currentPosition.id);
              }}
              onPartialClose={() => {
                closeContextMenu();
                if (currentPosition) onOpenPartialClose(currentPosition.id);
              }}
              onClosePosition={() => {
                closeContextMenu();
                if (currentPosition) onClosePosition(currentPosition.id);
              }}
              onPendingOrderRequest={(orderType) => {
                closeContextMenu();
                onPendingOrderRequest({ orderType, triggerPrice: contextMenu.price });
              }}
              onCreateAlertHere={() => {
                closeContextMenu();
                onCreateAlertHere(contextMenu.price);
              }}
            />
          )}
          {plotOverlayLabel && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[color:var(--wariba-chart-background)]/60">
              <span className="rounded-[var(--wariba-radius-sm)] bg-[color:var(--wariba-background-elevated)] px-3 py-1.5 text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-status-warning-text)]">
                {plotOverlayLabel}
              </span>
            </div>
          )}
        </div>
      </div>
      <ChartBottomBar
        timezone={chartSettings.symbol.timezone}
        historyCoverageSeconds={historyCoverageSeconds}
        onSelectHorizon={selectHorizon}
        scaleMode={scaleMode}
        onScaleModeChange={setScaleMode}
        autoScale={autoScale}
        onAutoScaleChange={setAutoScale}
      />
      <BottomSheet
        open={Boolean(contextMenu?.isTouchOrigin)}
        onClose={closeContextMenu}
        title={contextMenu ? `Prix ${contextMenu.price}` : ''}
      >
        {contextMenu && (
          <ChartContextMenuContent
            {...contextChartActions}
            clickedPriceFormatted={contextMenu.price}
            position={currentPosition}
            tick={tick}
            disabled={draggingDisabled}
            disabledReason={
              isStale
                ? 'Prix obsolète — actions indisponibles tant que le marché n’est pas à jour.'
                : isDisconnected
                  ? 'Connexion au serveur en cours…'
                  : null
            }
            onMarketBuy={() => {
              closeContextMenu();
              onMarketOrderRequest('buy');
            }}
            onMarketSell={() => {
              closeContextMenu();
              onMarketOrderRequest('sell');
            }}
            onManageStopLoss={() => {
              closeContextMenu();
              if (currentPosition) onOpenManage(currentPosition.id);
            }}
            onManageTakeProfit={() => {
              closeContextMenu();
              if (currentPosition) onOpenManage(currentPosition.id);
            }}
            onPartialClose={() => {
              closeContextMenu();
              if (currentPosition) onOpenPartialClose(currentPosition.id);
            }}
            onClosePosition={() => {
              closeContextMenu();
              if (currentPosition) onClosePosition(currentPosition.id);
            }}
            onPendingOrderRequest={(orderType) => {
              closeContextMenu();
              onPendingOrderRequest({ orderType, triggerPrice: contextMenu.price });
            }}
            onCreateAlertHere={() => {
              closeContextMenu();
              onCreateAlertHere(contextMenu.price);
            }}
          />
        )}
      </BottomSheet>
      {/* W5 §66/§68/§70 — one combined chart-tools sheet, not three panels
          stacked under the chart. Choosing a drawing tool closes it and hands
          the chart to that tool; toggling an indicator leaves it open, because
          a trader comparing two moving averages should not have to reopen the
          sheet between them. Nothing in here can submit a trade. */}
      <BottomSheet
        open={chartToolsOpen}
        onClose={() => setChartToolsOpen(false)}
        title="Outils du graphique"
      >
        {/* Rendered only while open. `BottomSheet` is a `<dialog>`, so its
            children stay mounted otherwise — which would put a second, hidden
            copy of every indicator checkbox and tool button in the accessibility
            tree alongside the desktop popover's. */}
        {/*
         * Visual closure §18 — a chart tool palette, not a settings panel.
         *
         * WX1 stacked three loosely-titled sections of full-width rows with a
         * lot of empty sheet below them. Each section now announces itself with
         * the same small-caps rule the workstation uses everywhere, indicators
         * are colour-ruled chips, drawings are a three-column icon grid, and the
         * view action is a full-width key rather than a lone button floating at
         * the left edge — so the sheet fills its own height with structure
         * instead of blank space. Every target stays at or above 44px.
         */}
        {chartToolsOpen && (
          <MobileToolsSheet
            tool={analysis.tool}
            onSelectTool={analysis.selectTool}
            cursorMode={analysis.cursorMode}
            onSelectCursorMode={analysis.selectCursorMode}
            favorites={analysis.favorites}
            onToggleFavorite={analysis.toggleFavorite}
            onOpenIndicators={openIndicators}
            onOpenSettings={openSettings}
            onResetView={fitChart}
            magnet={analysis.settings.canvas.crosshairMagnet}
            onToggleMagnet={toggleMagnet}
            keepDrawingMode={analysis.keepDrawingMode}
            onToggleKeepDrawingMode={analysis.toggleKeepDrawingMode}
            drawingsHidden={analysis.drawingsHidden}
            indicatorsHidden={analysis.indicatorsHidden}
            onSetDrawingsHidden={analysis.setDrawingsHidden}
            onSetIndicatorsHidden={analysis.setIndicatorsHidden}
            drawingCount={analysis.drawings.length}
            onRemoveAllDrawings={analysis.removeAllDrawings}
            onClose={() => setChartToolsOpen(false)}
          />
        )}
      </BottomSheet>

      {/*
       * §13/§28 — one library, two presentations.
       *
       * Desktop gets the centred modal the reference uses; a phone gets a native
       * sheet, because a 720px modal on a 390px screen is the "desktop shrunk"
       * failure §26 rules out. Both render the same `IndicatorLibrary`, so the
       * search, the favourites and the enabled states cannot drift apart.
       */}
      {isDesktop ? (
        /* Final closure §11 — no explanatory subtitle. "Analyse seulement…" was
           developer commentary about where indicator maths may not travel: a true
           statement, but an architecture note printed inside a trading terminal.
           The invariant it described is enforced in code (`chart-indicator-model`
           states it), not by a caption a trader reads once. */
        <ChartModal
          open={indicatorsOpen}
          onClose={() => setIndicatorsOpen(false)}
          title="Indicateurs"
          width={520}
          height={420}
          testId="chart-indicators-modal"
        >
          <IndicatorLibrary
            indicators={analysis.indicators}
            onToggle={analysis.toggleIndicator}
            favorites={analysis.favorites}
            onToggleFavorite={analysis.toggleFavorite}
          />
        </ChartModal>
      ) : (
        /* §12 — the sheet takes the height of its catalogue, not 90dvh. Four
           real rows under a 90dvh sheet left half a phone screen empty and made
           a short, honest list look like a page that had failed to load. `auto`
           hugs the content and still scrolls under its own ceiling when the
           catalogue grows. */
        <BottomSheet
          open={indicatorsOpen}
          onClose={() => setIndicatorsOpen(false)}
          title="Indicateurs"
          flush
        >
          {indicatorsOpen && (
            <IndicatorLibrary
              indicators={analysis.indicators}
              onToggle={analysis.toggleIndicator}
              favorites={analysis.favorites}
              onToggleFavorite={analysis.toggleFavorite}
              compact
            />
          )}
        </BottomSheet>
      )}

      <ChartSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={analysis.settings}
        onApply={analysis.applySettings}
        pricePrecision={pricePrecision}
      />

      <ObjectTreeModal
        open={objectTreeOpen}
        onClose={() => setObjectTreeOpen(false)}
        symbol={symbol}
        drawings={analysis.drawings}
        selectedId={analysis.selectedId}
        onSelectDrawing={analysis.select}
        onRemoveDrawing={analysis.removeDrawing}
        drawingsHidden={analysis.drawingsHidden}
        onSetDrawingsHidden={analysis.setDrawingsHidden}
        indicators={analysis.indicators}
        onToggleIndicator={analysis.toggleIndicator}
        indicatorsHidden={analysis.indicatorsHidden}
        onSetIndicatorsHidden={analysis.setIndicatorsHidden}
      />

      {/* §18 — "subtle confirmation. No toast explosion." One line, centred over
          the chart's own footer, gone in under two seconds. */}
      {copiedPrice !== null && (
        <div
          role="status"
          aria-live="polite"
          data-testid="chart-copied-price"
          className="pointer-events-none fixed bottom-16 left-1/2 z-[var(--wariba-z-popover)] -translate-x-1/2 rounded-[8px] border border-[color:var(--wariba-component-workstation-border-hairline)] bg-[color:var(--wariba-component-workstation-surface-popover)] px-3 py-1.5 text-[length:var(--wariba-component-workstation-type-label)] text-[color:var(--wariba-component-workstation-text-secondary)] shadow-[var(--wariba-component-workstation-elevation-popover)]"
        >
          Prix {copiedPrice} copié
        </div>
      )}
    </div>
  );
}
