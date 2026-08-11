'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  createChart,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import {
  CANDLE_TIMEFRAMES,
  type CandleTimeframe,
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
  computeRiskRewardRatio,
  pendingOrderDistancePoints,
} from '@wariba/domain';
import { BottomSheet } from '@wariba/ui';
import type { RealtimeConnectionState } from '../../../lib/realtime-client';
import { resolveLabelCollisions } from './chart-overlay-geometry';
import {
  PositionBadge,
  LevelChip,
  LevelHandle,
  DragPreviewPanel,
  type LevelSyncState,
} from './ChartPositionOverlay';
import { PendingOrderLine, AlertLine } from './ChartPendingOverlay';
import { ChartContextMenuPopover, ChartContextMenuContent } from './ChartContextMenu';
import {
  createChartHistoryController,
  type ChartHistorySeriesSink,
  type ChartHistoryTransport,
} from './chart-history';
import type { TickStore } from './tick-store';
import { HISTORY_STATUS_MESSAGE } from './trade-copy';

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
}

/**
 * W3 §43 — the number-conversion boundary, and the only one.
 *
 * Canonical candles are decimal strings from the server's aggregator all the way
 * to this function; lightweight-charts wants `number`, so the conversion happens
 * here at the renderer's doorstep and nowhere earlier. No float ever becomes
 * canonical history state.
 */
function toRendererCandle(candle: MarketCandle) {
  return {
    time: candle.startTime as UTCTimestamp,
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
  };
}

/**
 * Emergency fallback for the frame before the container has been measured
 * (W1 §13). The steady-state height always comes from the ResizeObserver —
 * if this value is ever what the trader sees, the chart column has zero
 * computed height and that is the bug to fix, not this number.
 */
const CHART_FALLBACK_HEIGHT = 240;

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
}

const DRAG_CLICK_THRESHOLD_PX = 4;

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
}: TradeChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
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
  const [timeframe, setTimeframe] = useState<CandleTimeframe>(CANDLE_TIMEFRAMES[0]);
  const [chartVersion, setChartVersion] = useState(0);
  const [drag, setDrag] = useState<DragSession | null>(null);
  const dragRef = useRef<DragSession | null>(null);
  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);
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
    const crosshairColor = readToken(container, '--wariba-chart-crosshair', '#9AA3B1');
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
      layout: { background: { color: background }, textColor },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      rightPriceScale: { borderColor: axisColor },
      timeScale: { borderColor: axisColor, timeVisible: true, secondsVisible: true },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: crosshairColor, labelBackgroundColor: crosshairColor },
        horzLine: { color: crosshairColor, labelBackgroundColor: crosshairColor },
      },
    });
    const series = chart.addCandlestickSeries({
      upColor,
      downColor,
      borderUpColor: upColor,
      borderDownColor: downColor,
      wickUpColor: upColor,
      wickDownColor: downColor,
    });
    chartRef.current = chart;
    seriesRef.current = series;

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
    const measure = () => {
      const node = containerRef.current;
      if (!node) return;
      const width = node.clientWidth;
      const height = node.clientHeight;
      if (width <= 0 || height <= 0) return;
      if (width === lastWidth && height === lastHeight) return;
      lastWidth = width;
      lastHeight = height;
      chart.applyOptions({ width, height });
      bumpChartVersion();
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);

    chart.timeScale().subscribeVisibleLogicalRangeChange(bumpChartVersion);

    return () => {
      observer.disconnect();
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(bumpChartVersion);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
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
      setData: (candles) => seriesRef.current?.setData(candles.map(toRendererCandle)),
      update: (candle) => seriesRef.current?.update(toRendererCandle(candle)),
      fitContent: () => chartRef.current?.timeScale().fitContent(),
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
    history.start({ symbol, timeframe, pricePrecision });
  }, [history, symbol, timeframe, pricePrecision]);

  // Symbol or timeframe change: drop the interaction state that belonged to the
  // previous instrument/interval. The candle series itself is the history
  // controller's business (it clears and rehydrates on identity change), and the
  // markers are restored by their own effect below.
  useEffect(() => {
    seriesRef.current?.setMarkers([]);
    setDrag(null);
    setOrderDrag(null);
    setContextMenu(null);
  }, [symbol, timeframe]);

  // New tick for the selected symbol: bid/ask price lines only. Candle
  // aggregation deliberately does NOT happen here — see the `store` prop.
  useEffect(() => {
    if (!tick || !seriesRef.current) return;

    // Bid/ask price lines (§23.2 "prix bid/ask distincts") — replaced each
    // tick rather than moved, createPriceLine has no update-in-place API.
    if (bidLineRef.current) seriesRef.current.removePriceLine(bidLineRef.current);
    if (askLineRef.current) seriesRef.current.removePriceLine(askLineRef.current);
    bidLineRef.current = seriesRef.current.createPriceLine({
      price: Number(tick.bid),
      color: colorsRef.current.bid,
      lineWidth: 1,
      lineStyle: 3,
      axisLabelVisible: true,
      title: 'Bid',
    });
    askLineRef.current = seriesRef.current.createPriceLine({
      price: Number(tick.ask),
      color: colorsRef.current.ask,
      lineWidth: 1,
      lineStyle: 3,
      axisLabelVisible: true,
      title: 'Ask',
    });
    setChartVersion((v) => v + 1);
  }, [tick]);

  // Position + SL/TP native lines for the selected symbol — rebuilt
  // whenever the open-position list changes (a fill, a close, an SL/TP
  // edit). Never removed just because a drag is in progress — only an
  // authoritative position update (this prop) ever changes these.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    for (const line of positionLinesRef.current) series.removePriceLine(line);
    positionLinesRef.current = [];

    for (const position of positions) {
      positionLinesRef.current.push(
        series.createPriceLine({
          price: Number(position.averageOpenPrice),
          color: colorsRef.current.position,
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: position.side === 'buy' ? 'Achat' : 'Vente',
        }),
      );
      if (position.stopLoss) {
        positionLinesRef.current.push(
          series.createPriceLine({
            price: Number(position.stopLoss),
            color: colorsRef.current.stopLoss,
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'SL',
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
            axisLabelVisible: true,
            title: 'TP',
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
      previewLineRef.current = series.createPriceLine({
        price: Number(drag.previewPrice),
        color: colorsRef.current.preview,
        lineWidth: 2,
        lineStyle: 1,
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

  // Fill markers (§22.6 "historique d'exécution") — session-only, see the
  // component doc comment above for why nothing retroactive is possible.
  useEffect(() => {
    if (!seriesRef.current) return;
    const markers: SeriesMarker<Time>[] = fills
      .map((fill) => ({
        time: fill.time as UTCTimestamp,
        position: (fill.side === 'buy' ? 'belowBar' : 'aboveBar') as 'belowBar' | 'aboveBar',
        color: fill.effect === 'open' ? colorsRef.current.position : colorsRef.current.axis,
        shape: (fill.side === 'buy' ? 'arrowUp' : 'arrowDown') as 'arrowUp' | 'arrowDown',
        text: `${fill.effect === 'open' ? 'Ouverture' : 'Clôture'} ${fill.price}`,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));
    seriesRef.current.setMarkers(markers);
  }, [fills]);

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
      setDrag({ ...session, previewPrice: rounded, moved: moved || session.moved });
    };
    const handleUp = (event: PointerEvent) => {
      const session = dragRef.current;
      if (!session) return;
      setDrag(null);
      // A tap (never moved beyond the click threshold) opens exact-price
      // entry instead of committing a drag — see LevelChip/LevelHandle's
      // onActivate, which already handles the "click" case directly; this
      // only fires the drag commit for an actual drag gesture.
      if (session.moved) {
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

  const handleContainerPointerDown = (event: React.PointerEvent) => {
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
    const start = longPressStartRef.current;
    if (!start || event.pointerType !== 'touch') return;
    if (Math.abs(event.clientX - start.x) > 10 || Math.abs(event.clientY - start.y) > 10) {
      clearLongPressTimer();
    }
  };

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

    for (const position of positions) {
      const y = series.priceToCoordinate(Number(position.averageOpenPrice));
      if (y !== null) badgeInputs.push({ id: `badge:${position.id}`, y, height: 26 });
      if (position.stopLoss) {
        const slY = series.priceToCoordinate(Number(position.stopLoss));
        if (slY !== null) levelInputs.push({ id: `sl:${position.id}`, y: slY, height: 22 });
      }
      if (position.takeProfit) {
        const tpY = series.priceToCoordinate(Number(position.takeProfit));
        if (tpY !== null) levelInputs.push({ id: `tp:${position.id}`, y: tpY, height: 22 });
      }
    }
    for (const placement of resolveLabelCollisions(badgeInputs)) {
      badgeY.set(placement.id, placement.y);
    }
    for (const placement of resolveLabelCollisions(levelInputs)) {
      levelY.set(placement.id, placement.y);
    }
    return { badgeY, levelY };
  }, [positions, spec, chartVersion]);

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

  const dragPreviewCard = useMemo(() => {
    if (!drag || !spec) return null;
    const position = positions.find((p) => p.id === drag.positionId);
    if (!position) return null;
    const reference = referencePriceFor(position);
    if (!reference) return null;
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
    };
  }, [drag, positions, spec, accountEquity, dailyLossRemaining, tick]);

  const overlayLabel = useMemo(() => {
    if (isDisconnected)
      return connectionState === 'resyncing' ? 'Resynchronisation…' : 'Reconnexion…';
    if (isStale) return 'Prix obsolète';
    return null;
  }, [isDisconnected, isStale, connectionState]);

  const syncStateFor = (positionId: string, field: RiskLevelField): LevelSyncState => {
    if (drag && drag.positionId === positionId && drag.field === field) return 'dragging_preview';
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

  // Read at render time rather than mirrored into state: this component already
  // re-renders on every accepted tick (the `tick` prop), so the count is fresh
  // without a second subscription, and no extra render is caused by history.
  const historySeries = history.series();
  const historyCandleCount = historySeries.finalized.length;
  const historyNewestBucket = historySeries.finalized.at(-1)?.startTime ?? '';
  const historyMessage =
    historyState.status === 'idle' || historyState.status === 'ready'
      ? null
      : HISTORY_STATUS_MESSAGE[historyState.status];

  return (
    // W1 §9 — min-h-0 at every ownership boundary: without it a flex child
    // refuses to shrink below its content, and the chart column would push
    // the workstation grid past the viewport instead of taking what is left.
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between">
        <div className="flex gap-1">
          {CANDLE_TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              aria-pressed={tf === timeframe}
              className={`rounded-[var(--wariba-radius-sm)] px-2 py-1 text-[length:var(--wariba-font-size-label-sm)] ${
                tf === timeframe
                  ? 'bg-[color:var(--wariba-surface-selected)] text-[color:var(--wariba-theme-text)]'
                  : 'text-[color:var(--wariba-text-secondary)]'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
        <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
          UTC
        </span>
      </div>
      {/* The overlays below are absolutely positioned against this box, and
          the chart container fills it exactly (inset-0), so every
          priceToCoordinate/timeToCoordinate value stays measured from the
          same origin it was before the container started owning its height. */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={containerRef}
          className="absolute inset-0"
          role="group"
          aria-label={`Graphique ${symbol}`}
          onContextMenuCapture={handleContextMenuEvent}
          onPointerDownCapture={handleContainerPointerDown}
          onPointerMoveCapture={handleContainerPointerMove}
          onPointerUpCapture={clearLongPressTimer}
          onPointerCancelCapture={clearLongPressTimer}
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
          className="pointer-events-none absolute left-2 top-2 z-10"
        >
          {historyMessage && (
            <span
              role="status"
              aria-live="polite"
              className="rounded-[var(--wariba-radius-sm)] bg-[color:var(--wariba-surface-raised)]/85 px-2 py-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]"
            >
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
            const sign = pnl !== null && Number(pnl) >= 0 ? '+' : '';
            return (
              <PositionBadge
                key={position.id}
                y={y}
                label={`${position.side === 'buy' ? 'ACHAT' : 'VENTE'} ${position.openQuantity} ${position.symbol}`}
                priceFormatted={position.averageOpenPrice}
                pnlFormatted={pnl !== null ? `${sign}${pnl} USD` : '—'}
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
                onManage={() => onOpenManage(position.id)}
                onClose={() => onClosePosition(position.id)}
                closeDisabled={commandPending}
                showCloseButton
              />
            );
          })}
        {overlay &&
          positions.map((position) => {
            const reference = referencePriceFor(position);
            const chips: React.ReactNode[] = [];
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
                const sign = Number(preview.estimatedPnl) >= 0 ? '+' : '';
                chips.push(
                  <LevelHandle
                    key={levelKey}
                    y={y}
                    kind={field}
                    priceFormatted={value}
                    pnlFormatted={`${sign}${preview.estimatedPnl} USD`}
                    syncState={syncStateFor(position.id, field)}
                    disabled={draggingDisabled}
                    onPointerDown={startDrag(position.id, field, value)}
                    onActivate={() => onOpenManage(position.id)}
                    onRemove={() => onCommitLevel({ positionId: position.id, field, value: null })}
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
              } else if (reference) {
                const badgeY = overlay.badgeY.get(`badge:${position.id}`);
                const y =
                  badgeY !== undefined ? badgeY + 24 * (field === 'stop_loss' ? 1 : 2) : undefined;
                if (y === undefined) return;
                chips.push(
                  <LevelChip
                    key={`chip:${field}:${position.id}`}
                    y={y}
                    kind={field}
                    disabled={draggingDisabled}
                    disabledReason={
                      isStale
                        ? 'Prix obsolète — indisponible tant que le marché n’est pas à jour.'
                        : null
                    }
                    onPointerDown={startDrag(position.id, field, reference)}
                    onActivate={() => onOpenManage(position.id)}
                  />,
                );
              }
            });
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
        {dragPreviewCard && <DragPreviewPanel {...dragPreviewCard} />}
        {contextMenu && !contextMenu.isTouchOrigin && (
          <ChartContextMenuPopover
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
        {overlayLabel && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[color:var(--wariba-chart-background)]/60">
            <span className="rounded-[var(--wariba-radius-sm)] bg-[color:var(--wariba-background-elevated)] px-3 py-1.5 text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-status-warning-text)]">
              {overlayLabel}
            </span>
          </div>
        )}
      </div>
      <BottomSheet
        open={Boolean(contextMenu?.isTouchOrigin)}
        onClose={closeContextMenu}
        title={contextMenu ? `Prix ${contextMenu.price}` : ''}
      >
        {contextMenu && (
          <ChartContextMenuContent
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
    </div>
  );
}
