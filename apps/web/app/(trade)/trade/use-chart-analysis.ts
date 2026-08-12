'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import type { CandleTimeframe, MarketCandle, TradableSymbol } from '@wariba/contracts';
import type { ChartHistoryController } from './chart-history';
import {
  findDrawingAt,
  grabAt,
  projectDrawing,
  type ChartCoordinateAdapter,
  type DrawingGrab,
  type ProjectedDrawing,
  type ProjectedPoint,
} from './chart-drawing-geometry';
import {
  DEFAULT_DRAWING_STYLE,
  MAX_DRAWINGS_PER_SYMBOL,
  type ChartDrawing,
  type ChartDrawingAnchor,
} from './chart-drawing-model';
import { createChartDrawingStore } from './chart-drawing-store';
import {
  createChartIndicatorEngine,
  type ChartIndicatorEngine,
  type IndicatorLegendEntry,
} from './chart-indicator-engine';
import type { ChartIndicator } from './chart-indicator-model';
import { useChartPreferences } from './chart-preferences';
import {
  advanceDraft,
  beginDraft,
  draftAnchors,
  moveAnchor,
  moveToPrice,
  toolDrawingType,
  type ChartTool,
  type DraftDrawing,
} from './chart-tool-mode';
import { createCoordinateAdapter, createIndicatorSeriesRenderer } from './chart-renderer-adapters';

/**
 * The chart-analysis layer, as one hook — W5 B4-B8.
 *
 * It exists to keep `TradeChart.tsx` a *renderer and trading-overlay* component
 * rather than a 2000-line everything-component: indicators, drawings, tool mode
 * and the analysis preferences all live here, and TradeChart consumes a small
 * surface of stable callbacks.
 *
 * **Render ownership** (§72). Everything expensive is imperative. The indicator
 * engine is driven from the history controller's sink, so an accepted tick moves
 * a line without any React state changing; the drawing store is an external
 * store read through `useSyncExternalStore`-style versioning, so a drag updates
 * chart-local state and nothing above the chart column. Nothing here can
 * re-render the workstation shell, nav rail, status bar, account switcher, dock
 * chrome or Market Navigator chrome.
 *
 * **No trading side effects** (§44/§84/§85). Nothing in this file constructs an
 * order, an alert, a stop loss or a take profit, and the drawing model it
 * manipulates has no path to one.
 */

export interface ChartAnalysisDeps {
  accountId: string;
  symbol: TradableSymbol;
  pricePrecision: number | null;
  history: ChartHistoryController;
  chartRef: React.RefObject<IChartApi | null>;
  seriesRef: React.RefObject<ISeriesApi<'Candlestick'> | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Bumped by TradeChart whenever the scale, size or data changed. */
  chartVersion: number;
}

export interface ChartAnalysis {
  timeframe: CandleTimeframe;
  /** False until the stored analysis preferences have been read — see `useChartPreferences`. */
  preferencesLoaded: boolean;
  selectTimeframe(timeframe: CandleTimeframe): void;
  indicators: ChartIndicator[];
  toggleIndicator(id: string): void;
  legend: IndicatorLegendEntry[];

  tool: ChartTool;
  selectTool(tool: ChartTool): void;
  /** True while a drawing tool owns the pointer — TradeChart suppresses its trade gestures (§58). */
  drawingModeActive: boolean;

  projected: ProjectedDrawing[];
  projectedDraft: ProjectedDrawing | null;
  selectedId: string | null;
  selectedDrawing: ChartDrawing | null;
  clearSelection(): void;
  deleteSelected(): void;
  cycleSelectedColor(): void;
  atDrawingLimit: boolean;

  /** Called by TradeChart's chart-creation effect, and its cleanup. */
  attachRenderer(chart: IChartApi): void;
  detachRenderer(): void;
  /** Called from the history sink — see TradeChart's `sink`. */
  onSeriesReplaced(): void;
  onSeriesLiveUpdate(): void;

  /**
   * Chart-container pointer handling. Returns true when the drawing layer
   * consumed the gesture, so TradeChart can skip its long-press/context handling.
   */
  handlePointerDown(event: React.PointerEvent): boolean;
  handlePointerMove(event: React.PointerEvent): void;
  handlePointerUp(event: React.PointerEvent): void;
}

function localPoint(container: HTMLElement, clientX: number, clientY: number): ProjectedPoint {
  const rect = container.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

/** A drag in progress — an anchor, or a whole horizontal line. */
interface DrawingDrag {
  id: string;
  grab: DrawingGrab;
  /** Live record; committed to storage on pointer up only (§73/§125). */
  draft: ChartDrawing;
}

export function useChartAnalysis(deps: ChartAnalysisDeps): ChartAnalysis {
  const { accountId, symbol, pricePrecision, history, chartRef, seriesRef, containerRef } = deps;

  const { preferences, loaded, setTimeframe, setIndicators } = useChartPreferences(accountId);
  const [tool, setTool] = useState<ChartTool>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftDrawing | null>(null);
  const [drag, setDrag] = useState<DrawingDrag | null>(null);
  const dragRef = useRef<DrawingDrag | null>(null);
  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  const store = useMemo(() => createChartDrawingStore(accountId), [accountId]);
  const [storeVersion, setStoreVersion] = useState(0);
  useEffect(() => store.subscribe(() => setStoreVersion((value) => value + 1)), [store]);

  const engineRef = useRef<ChartIndicatorEngine | null>(null);
  const rendererRef = useRef<ReturnType<typeof createIndicatorSeriesRenderer> | null>(null);
  const [engineVersion, setEngineVersion] = useState(0);

  const adapter: ChartCoordinateAdapter = useMemo(
    () =>
      createCoordinateAdapter({
        chart: () => chartRef.current,
        series: () => seriesRef.current,
        container: () => containerRef.current,
        candleTimes: () => {
          const { finalized, current } = history.series();
          const times = finalized.map((candle) => candle.startTime);
          if (current !== null) times.push(current.startTime);
          return times;
        },
        pricePrecision: () => pricePrecision,
      }),
    [chartRef, seriesRef, containerRef, history, pricePrecision],
  );

  /**
   * Timeframe, symbol or indicator configuration changed: the engine's inputs
   * are no longer what it calculated from. `configure` handles series lifecycle
   * and recalculation together, so there is one place that can create or destroy
   * a line series (§123).
   */
  useEffect(() => {
    // Waiting for `loaded` for the same reason the history request does: without
    // it, every mount would build the four default series, then destroy the ones
    // the trader had switched off a frame later (§122/§123).
    if (!loaded) return;
    engineRef.current?.configure(preferences.indicators, preferences.timeframe);
  }, [loaded, preferences.indicators, preferences.timeframe, symbol, engineVersion]);

  // §78/§131 — a symbol or timeframe change cancels an unfinished drawing and
  // returns to Select. A half-created object is never persisted, so there is
  // nothing to clean up beyond dropping the draft.
  useEffect(() => {
    setDraft(null);
    setDrag(null);
    setSelectedId(null);
    setTool('select');
  }, [symbol, preferences.timeframe]);

  const drawings = useMemo(() => {
    void storeVersion;
    return store.list(symbol);
  }, [store, symbol, storeVersion]);

  /**
   * §48/§132 — projection is recomputed from the *stored* anchors every time the
   * scale moves, and a drawing that cannot be projected right now is simply
   * absent from this list. Its record is never rewritten because history got
   * shallower or deeper.
   */
  const projected = useMemo(() => {
    void deps.chartVersion;
    const live = dragRef.current;
    const result: ProjectedDrawing[] = [];
    for (const drawing of drawings) {
      const source = live !== null && live.id === drawing.id ? live.draft : drawing;
      const entry = projectDrawing(adapter, source);
      if (entry !== null) result.push(entry);
    }
    return result;
  }, [drawings, adapter, deps.chartVersion, drag]);

  const projectedDraft = useMemo(() => {
    void deps.chartVersion;
    if (draft === null) return null;
    const anchors = draftAnchors(draft);
    if (anchors.length === 0) return null;
    return projectDrawing(adapter, {
      id: '__draft__',
      type: draft.type,
      symbol: draft.symbol,
      anchors,
      style: { ...DEFAULT_DRAWING_STYLE, lineStyle: 'dashed' },
      createdAt: 0,
      updatedAt: 0,
    });
  }, [draft, adapter, deps.chartVersion]);

  const selectedDrawing = useMemo(
    () => drawings.find((drawing) => drawing.id === selectedId) ?? null,
    [drawings, selectedId],
  );

  const anchorAt = useCallback(
    (point: ProjectedPoint): ChartDrawingAnchor | null => {
      const time = adapter.xToTime(point.x);
      const price = adapter.yToPrice(point.y);
      if (time === null || price === null) return null;
      return { time, price };
    },
    [adapter],
  );

  const commitDraftAnchor = useCallback(
    (anchor: ChartDrawingAnchor) => {
      setDraft((current) => {
        if (current === null) return null;
        const advanced = advanceDraft(
          current,
          anchor,
          () => crypto.randomUUID(),
          () => Date.now(),
        );
        if (advanced.status === 'pending') return advanced.draft;
        store.add(advanced.drawing);
        setSelectedId(advanced.drawing.id);
        // §49/§68 — back to Select once the drawing is placed, so the next
        // gesture is a trading gesture again unless the trader says otherwise.
        setTool('select');
        return null;
      });
    },
    [store],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent): boolean => {
      const container = containerRef.current;
      if (!container) return false;
      const point = localPoint(container, event.clientX, event.clientY);

      const drawingType = toolDrawingType(tool);
      if (drawingType !== null) {
        // §58 — the gesture belongs to the tool, exclusively. No context menu,
        // no quick order, no alert, and lightweight-charts does not pan.
        event.preventDefault();
        event.stopPropagation();
        const anchor = anchorAt(point);
        if (anchor === null) return true;
        if (draft === null) {
          const started = beginDraft(drawingType, symbol);
          const advanced = advanceDraft(
            started,
            anchor,
            () => crypto.randomUUID(),
            () => Date.now(),
          );
          if (advanced.status === 'complete') {
            store.add(advanced.drawing);
            setSelectedId(advanced.drawing.id);
            setTool('select');
          } else {
            setDraft(advanced.draft);
          }
        } else {
          commitDraftAnchor(anchor);
        }
        return true;
      }

      // Select mode. Trading overlays are separate DOM elements painted above
      // this container, so a pointer that reached here did not hit one — which
      // is how §57's priority is enforced structurally rather than by z-index
      // arithmetic.
      const hit = findDrawingAt(projected, point);
      if (hit === null) {
        if (selectedId !== null) setSelectedId(null);
        return false;
      }

      const grab = grabAt(hit, point);
      setSelectedId(hit.id);
      if (grab === null) return true;

      event.preventDefault();
      event.stopPropagation();
      // §90 — pointer capture keeps the drag alive when the pointer leaves the
      // chart, which a real click-and-drag routinely does. It is best-effort:
      // a pointer id the environment does not recognise must not break the
      // drag, let alone the chart.
      try {
        container.setPointerCapture?.(event.pointerId);
      } catch {
        // Capture unavailable — the window-level move/up handlers still work.
      }
      const next: DrawingDrag = { id: hit.id, grab, draft: hit.drawing };
      dragRef.current = next;
      setDrag(next);
      return true;
    },
    [containerRef, tool, draft, symbol, store, commitDraftAnchor, anchorAt, projected, selectedId],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const point = localPoint(container, event.clientX, event.clientY);

      const session = dragRef.current;
      if (session !== null) {
        // §73 — chart-local state only. Storage is not written here, and the
        // workstation above the chart column does not re-render.
        const anchor = anchorAt(point);
        if (anchor === null) return;
        const updated =
          session.grab.kind === 'body'
            ? moveToPrice(session.draft, anchor.price, () => Date.now())
            : moveAnchor(session.draft, session.grab.index, anchor, () => Date.now());
        const next = { ...session, draft: updated };
        dragRef.current = next;
        setDrag(next);
        return;
      }

      if (draft !== null) {
        const anchor = anchorAt(point);
        if (anchor === null) return;
        setDraft({ ...draft, preview: anchor });
      }
    },
    [containerRef, anchorAt, draft],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent) => {
      const session = dragRef.current;
      if (session === null) return;
      try {
        containerRef.current?.releasePointerCapture?.(event.pointerId);
      } catch {
        // Never captured, or already released — nothing to undo.
      }
      dragRef.current = null;
      setDrag(null);
      // §73/§125 — one write, at the end of the gesture.
      store.replace(session.draft);
    },
    [containerRef, store],
  );

  /**
   * §89/§112/§113 — Escape cancels, Delete removes.
   *
   * Escape is only claimed when a drawing gesture is genuinely in progress, so a
   * dialog or a sheet keeps its own Escape when the chart has nothing to cancel.
   * Delete is only claimed when a drawing is selected and focus is not in a text
   * field, so it can never reach a pending order, an alert or a position.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (draft !== null) {
          event.stopPropagation();
          setDraft(null);
          setTool('select');
          return;
        }
        if (tool !== 'select') {
          event.stopPropagation();
          setTool('select');
          return;
        }
        if (selectedId !== null) setSelectedId(null);
        return;
      }
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      if (selectedId === null) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      event.preventDefault();
      store.remove(symbol, selectedId);
      setSelectedId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [draft, tool, selectedId, store, symbol]);

  const legend = useMemo(() => {
    void deps.chartVersion;
    void engineVersion;
    return engineRef.current?.legend() ?? [];
  }, [deps.chartVersion, engineVersion]);

  const attachRenderer = useCallback(
    (chart: IChartApi) => {
      const renderer = createIndicatorSeriesRenderer(chart);
      rendererRef.current = renderer;
      engineRef.current = createChartIndicatorEngine({
        renderer,
        candles: () => history.series(),
        timeframe: preferences.timeframe,
      });
      // Re-runs the configure effect above now that an engine exists to receive it.
      setEngineVersion((value) => value + 1);
    },
    [history, preferences.timeframe],
  );

  const detachRenderer = useCallback(() => {
    // The chart is being removed wholesale, which disposes its series with it —
    // but the engine's map must be cleared or a re-created chart would inherit
    // handles to series that no longer exist (§122).
    engineRef.current?.dispose();
    engineRef.current = null;
    rendererRef.current = null;
  }, []);

  const onSeriesReplaced = useCallback(() => {
    engineRef.current?.rebuild();
  }, []);

  const onSeriesLiveUpdate = useCallback(() => {
    engineRef.current?.onLiveUpdate();
  }, []);

  const toggleIndicator = useCallback(
    (id: string) => {
      setIndicators(
        preferences.indicators.map((indicator) =>
          indicator.id === id ? { ...indicator, enabled: !indicator.enabled } : indicator,
        ),
      );
    },
    [preferences.indicators, setIndicators],
  );

  const selectTool = useCallback((next: ChartTool) => {
    setDraft(null);
    setSelectedId(null);
    setTool(next);
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedId === null) return;
    store.remove(symbol, selectedId);
    setSelectedId(null);
  }, [selectedId, store, symbol]);

  /** §53 — restrained styling: cycle the palette, no colour picker, no editor. */
  const cycleSelectedColor = useCallback(() => {
    if (selectedDrawing === null) return;
    const palette = ['#9AA3B1', '#6684FF', '#E0A458', '#4FA3A5', '#B48EAD'] as const;
    const index = palette.indexOf(selectedDrawing.style.color as (typeof palette)[number]);
    const color = palette[(index + 1) % palette.length] ?? palette[0];
    store.replace({
      ...selectedDrawing,
      style: { ...selectedDrawing.style, color },
      updatedAt: Date.now(),
    });
  }, [selectedDrawing, store]);

  return {
    timeframe: preferences.timeframe,
    preferencesLoaded: loaded,
    selectTimeframe: setTimeframe,
    indicators: preferences.indicators,
    toggleIndicator,
    legend,
    tool,
    selectTool,
    drawingModeActive: tool !== 'select',
    projected,
    projectedDraft,
    selectedId,
    selectedDrawing,
    clearSelection: () => setSelectedId(null),
    deleteSelected,
    cycleSelectedColor,
    atDrawingLimit: drawings.length >= MAX_DRAWINGS_PER_SYMBOL,
    attachRenderer,
    detachRenderer,
    onSeriesReplaced,
    onSeriesLiveUpdate,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}

/** The candle the OHLC legend should show: the crosshair's, else the live one (§65). */
export function legendCandle(
  history: ChartHistoryController,
  hovered: MarketCandle | null,
): MarketCandle | null {
  if (hovered !== null) return hovered;
  const { finalized, current } = history.series();
  return current ?? finalized.at(-1) ?? null;
}
