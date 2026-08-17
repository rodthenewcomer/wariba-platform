import { beforeEach, describe, expect, it } from 'vitest';
import {
  CHART_DRAWING_TYPES,
  DEFAULT_DRAWING_STYLE,
  DRAWING_ANCHOR_COUNT,
  FIBONACCI_LEVELS,
  MAX_DRAWINGS_PER_SYMBOL,
  fibonacciLevelLabel,
  fibonacciLevelPrices,
  parseChartDrawing,
  type ChartDrawing,
} from '../app/(trade)/trade/chart-drawing-model';
import {
  CHART_DRAWINGS_STORAGE_KEY,
  createChartDrawingStore,
  parseStoredDrawings,
} from '../app/(trade)/trade/chart-drawing-store';
import {
  DRAWING_HIT_TOLERANCE_PX,
  extendRay,
  findDrawingAt,
  grabAt,
  handlePoints,
  hitTestDrawing,
  projectDrawing,
  type ChartCoordinateAdapter,
} from '../app/(trade)/trade/chart-drawing-geometry';
import {
  advanceDraft,
  beginDraft,
  moveAnchor,
  moveToPrice,
  toolDrawingType,
} from '../app/(trade)/trade/chart-tool-mode';

/**
 * W5 §104-§109, §113-§115 — the drawing model, its projection and its storage.
 *
 * Everything here runs without a chart engine, which is the point: if these
 * tests needed lightweight-charts, the model would not be renderer-independent
 * and W0's ARCH-028 seam would be fiction.
 */

function drawing(overrides: Partial<ChartDrawing> = {}): ChartDrawing {
  return {
    id: 'draw-1',
    type: 'trend_line',
    symbol: 'EURUSD',
    anchors: [
      { time: 100, price: '1.08000' },
      { time: 200, price: '1.09000' },
    ],
    style: { ...DEFAULT_DRAWING_STYLE },
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    ...overrides,
  };
}

/**
 * A deterministic stand-in for the lightweight-charts adapter: time 100 → x 100,
 * price 1.08 → y 800 (prices rise as y falls, as on a real price scale).
 */
const adapter: ChartCoordinateAdapter = {
  timeToX: (time) => (time < 0 || time > 1000 ? null : time),
  priceToY: (price) => 1000 - Number(price) * 100,
  xToTime: (x) => Math.round(x / 10) * 10,
  yToPrice: (y) => ((1000 - y) / 100).toFixed(5),
  width: () => 500,
  height: () => 400,
};

describe('serialization — W5 §104', () => {
  it('round-trips every supported drawing type', () => {
    for (const type of CHART_DRAWING_TYPES) {
      const anchors = Array.from({ length: DRAWING_ANCHOR_COUNT[type] }, (_, index) => ({
        time: 100 + index * 100,
        price: (1.08 + index * 0.01).toFixed(5),
      }));
      const record = drawing({ type, anchors });
      const parsed = parseChartDrawing(JSON.parse(JSON.stringify(record)));
      expect(parsed, type).toEqual(record);
    }
  });

  it('discards an unknown type, an invalid price, a bad anchor count and a bad style', () => {
    for (const malformed of [
      null,
      'trend_line',
      drawing({ type: 'text' as never }),
      drawing({ symbol: 'DOGEUSD' as never }),
      drawing({ anchors: [{ time: 100, price: 'abc' }] }),
      drawing({ anchors: [{ time: 100, price: '1.08000' }] }), // trend line needs two
      drawing({
        anchors: [
          { time: -1, price: '1.08000' },
          { time: 200, price: '1.09000' },
        ],
      }),
      drawing({
        anchors: [
          { time: 1.5, price: '1.08' },
          { time: 200, price: '1.09' },
        ],
      }),
      drawing({ style: { ...DEFAULT_DRAWING_STYLE, color: '#FF0000' as never } }),
      drawing({ style: { ...DEFAULT_DRAWING_STYLE, lineStyle: 'dotty' as never } }),
      drawing({ createdAt: Number.NaN }),
    ]) {
      expect(parseChartDrawing(malformed)).toBeNull();
    }
  });

  it('carries no free-form text anywhere — nothing stored can become markup (§136/§137)', () => {
    const record = drawing();
    const fields = Object.values(record).filter((value) => typeof value === 'string');
    // Only `id`, `type` and `symbol` are strings, and all three are validated
    // against closed sets or a length bound. There is no label field to escape.
    expect(fields).toEqual(['draw-1', 'trend_line', 'EURUSD']);
  });
});

describe('projection — W5 §43/§48/§107/§109', () => {
  it('spans a horizontal line across the plot from its single price anchor', () => {
    const projected = projectDrawing(
      adapter,
      drawing({ type: 'horizontal_line', anchors: [{ time: 100, price: '1.08000' }] }),
    );
    expect(projected?.points).toEqual([
      { x: 0, y: 892 },
      { x: 500, y: 892 },
    ]);
  });

  it('returns null for an anchor outside the loaded history rather than re-anchoring it (§48)', () => {
    const older = drawing({
      anchors: [
        { time: -5000, price: '1.08000' },
        { time: 200, price: '1.09000' },
      ],
    });
    expect(projectDrawing(adapter, older)).toBeNull();
    // The record itself is untouched — nothing rewrote its anchor.
    expect(older.anchors[0]?.time).toBe(-5000);
  });

  it('extends a ray past its second anchor while storing only two (§107)', () => {
    const ray = projectDrawing(adapter, drawing({ type: 'ray' }));
    expect(ray?.drawing.anchors).toHaveLength(2);
    expect(ray?.points).toHaveLength(2);
    expect(ray?.rayEnd?.x).toBe(500);
    // Handles are offered for the two stored anchors only — never the far end.
    expect(handlePoints(ray!)).toEqual(ray!.points);
  });

  it('extends a right-to-left ray leftwards, not toward the future', () => {
    const a = { x: 300, y: 100 };
    const b = { x: 200, y: 150 };
    expect(extendRay(a, b, 500)).toEqual({ x: 0, y: 250 });
  });

  it('computes the seven Fibonacci levels, in both drawing directions (§109)', () => {
    const up = fibonacciLevelPrices([
      { time: 100, price: '1.10000' },
      { time: 200, price: '1.00000' },
    ]);
    expect(up.map((entry) => entry.level)).toEqual([...FIBONACCI_LEVELS]);
    // Level 0 sits on the second anchor (where the move ended), level 1 on the first.
    expect(up[0]?.price).toBeCloseTo(1.0, 10);
    expect(up.at(-1)?.price).toBeCloseTo(1.1, 10);
    expect(up[4]?.price).toBeCloseTo(1.0 + 0.1 * 0.618, 10);

    const down = fibonacciLevelPrices([
      { time: 100, price: '1.00000' },
      { time: 200, price: '1.10000' },
    ]);
    expect(down[0]?.price).toBeCloseTo(1.1, 10);
    expect(down.at(-1)?.price).toBeCloseTo(1.0, 10);
  });

  it('labels levels as percentages without implying an action (§130)', () => {
    expect(FIBONACCI_LEVELS.map(fibonacciLevelLabel)).toEqual([
      '0',
      '23.6',
      '38.2',
      '50',
      '61.8',
      '78.6',
      '100',
    ]);
  });

  it('carries no extension levels in W5 (§43)', () => {
    expect(FIBONACCI_LEVELS.every((level) => level <= 1)).toBe(true);
  });

  it('projects the expanded analytical tools from canonical anchors', () => {
    const info = projectDrawing(adapter, drawing({ type: 'info_line' }));
    expect(info?.measure).toEqual({ price: '+0.01000', percent: '+0.93 %', duration: '1m' });

    const angle = projectDrawing(adapter, drawing({ type: 'trend_angle' }));
    expect(angle?.angleDegrees).toBeTypeOf('number');

    const extension = projectDrawing(
      adapter,
      drawing({
        type: 'fib_extension',
        anchors: [
          { time: 100, price: '1.00000' },
          { time: 200, price: '2.00000' },
          { time: 300, price: '1.50000' },
        ],
      }),
    );
    expect(extension?.levels?.map((level) => level.level)).toEqual([0, 0.618, 1, 1.272, 1.618]);
  });

  it('projects real multi-anchor channel and curved geometry', () => {
    const channel = projectDrawing(
      adapter,
      drawing({
        type: 'disjoint_channel',
        anchors: [
          { time: 100, price: '1.00000' },
          { time: 200, price: '1.10000' },
          { time: 300, price: '1.30000' },
          { time: 400, price: '1.50000' },
        ],
      }),
    );
    expect(channel?.parallel).toEqual([channel?.points[2], channel?.points[3]]);

    const curve = projectDrawing(
      adapter,
      drawing({
        type: 'curve',
        anchors: [
          { time: 100, price: '1.00000' },
          { time: 200, price: '1.30000' },
          { time: 300, price: '0.90000' },
          { time: 400, price: '1.20000' },
        ],
      }),
    );
    expect(curve?.points).toHaveLength(4);
  });
});

describe('hit testing — W5 §50/§57', () => {
  it('selects a trend line only near its stroke', () => {
    const projected = projectDrawing(adapter, drawing())!;
    const [a] = projected.points;
    expect(hitTestDrawing(projected, { x: a!.x, y: a!.y })).toBe(true);
    expect(hitTestDrawing(projected, { x: a!.x, y: a!.y + DRAWING_HIT_TOLERANCE_PX * 4 })).toBe(
      false,
    );
  });

  it('hits a rectangle on its edges and never through its interior', () => {
    const rect = projectDrawing(
      adapter,
      drawing({
        type: 'rectangle',
        anchors: [
          { time: 100, price: '1.00000' },
          { time: 300, price: '2.00000' },
        ],
      }),
    )!;
    const [a, b] = rect.points;
    // On the top edge.
    expect(hitTestDrawing(rect, { x: (a!.x + b!.x) / 2, y: a!.y })).toBe(true);
    // Dead centre — an interior fill must not swallow a trading gesture (§57).
    expect(hitTestDrawing(rect, { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 })).toBe(false);
  });

  it('picks the most recently created drawing when two overlap', () => {
    const older = projectDrawing(adapter, drawing({ id: 'older' }))!;
    const newer = projectDrawing(adapter, drawing({ id: 'newer' }))!;
    const [a] = older.points;
    expect(findDrawingAt([older, newer], { x: a!.x, y: a!.y })?.id).toBe('newer');
  });

  it('grabs an endpoint when the pointer is on a handle, and the body otherwise', () => {
    const projected = projectDrawing(adapter, drawing())!;
    const [a, b] = projected.points;
    expect(grabAt(projected, { x: a!.x, y: a!.y })).toEqual({ kind: 'anchor', index: 0 });
    expect(grabAt(projected, { x: b!.x, y: b!.y })).toEqual({ kind: 'anchor', index: 1 });
    expect(grabAt(projected, { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 })).toEqual({
      kind: 'body',
    });
    expect(grabAt(projected, { x: 480, y: 20 })).toBeNull();
  });
});

describe('editing — W5 §51/§106/§108', () => {
  it('moves one endpoint and leaves the other exactly where it was', () => {
    const before = drawing();
    const after = moveAnchor(before, 0, { time: 150, price: '1.08500' }, () => 42);
    expect(after.anchors[0]).toEqual({ time: 150, price: '1.08500' });
    expect(after.anchors[1]).toEqual(before.anchors[1]);
    expect(after.updatedAt).toBe(42);
    // Immutable: the original record is untouched.
    expect(before.anchors[0]).toEqual({ time: 100, price: '1.08000' });
  });

  it('moves a horizontal line by price only', () => {
    const before = drawing({ type: 'horizontal_line', anchors: [{ time: 100, price: '1.08000' }] });
    const after = moveToPrice(before, '1.09500', () => 42);
    expect(after.anchors[0]).toEqual({ time: 100, price: '1.09500' });
  });

  it('moves a rectangle corner without touching the opposite one', () => {
    const before = drawing({
      type: 'rectangle',
      anchors: [
        { time: 100, price: '1.00000' },
        { time: 300, price: '2.00000' },
      ],
    });
    const after = moveAnchor(before, 1, { time: 400, price: '2.50000' }, () => 42);
    expect(after.anchors[0]).toEqual(before.anchors[0]);
    expect(after.anchors[1]).toEqual({ time: 400, price: '2.50000' });
  });
});

describe('the creation flow — W5 §49/§78/§112', () => {
  it('completes a horizontal line on the first anchor', () => {
    const draft = beginDraft('horizontal_line', 'EURUSD');
    const advanced = advanceDraft(
      draft,
      { time: 100, price: '1.08000' },
      () => 'new-id',
      () => 7,
    );
    expect(advanced.status).toBe('complete');
    if (advanced.status !== 'complete') throw new Error('unreachable');
    expect(advanced.drawing.anchors).toHaveLength(1);
    expect(advanced.drawing.id).toBe('new-id');
  });

  it('needs two anchors for a trend line, a ray, a rectangle and a Fibonacci', () => {
    for (const type of ['trend_line', 'ray', 'rectangle', 'fibonacci'] as const) {
      const first = advanceDraft(
        beginDraft(type, 'EURUSD'),
        { time: 100, price: '1.08000' },
        () => 'x',
        () => 7,
      );
      expect(first.status, type).toBe('pending');
      if (first.status !== 'pending') throw new Error('unreachable');
      const second = advanceDraft(
        first.draft,
        { time: 200, price: '1.09000' },
        () => 'x',
        () => 7,
      );
      expect(second.status, type).toBe('complete');
    }
  });

  it('never yields a half-created record', () => {
    const first = advanceDraft(
      beginDraft('rectangle', 'EURUSD'),
      { time: 100, price: '1.08000' },
      () => 'x',
      () => 7,
    );
    // The pending draft is not a ChartDrawing — it has no id, no style and no
    // timestamps, so there is nothing storage could accidentally accept (§49).
    expect(first.status).toBe('pending');
    if (first.status !== 'pending') throw new Error('unreachable');
    expect('id' in first.draft).toBe(false);
  });

  it('maps every tool but Select to a drawing type (§131)', () => {
    expect(toolDrawingType('select')).toBeNull();
    for (const type of CHART_DRAWING_TYPES) expect(toolDrawingType(type)).toBe(type);
  });
});

describe('storage — W5 §54/§55/§56/§105/§114', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists a drawing and returns it after a reload', () => {
    const store = createChartDrawingStore('acc-1');
    store.add(drawing({ id: 'persisted' }));

    const reloaded = createChartDrawingStore('acc-1');
    expect(reloaded.list('EURUSD').map((entry) => entry.id)).toEqual(['persisted']);
  });

  it('removes a drawing, and it stays gone after a reload', () => {
    const store = createChartDrawingStore('acc-1');
    store.add(drawing({ id: 'persisted' }));
    store.remove('EURUSD', 'persisted');

    expect(createChartDrawingStore('acc-1').list('EURUSD')).toEqual([]);
  });

  it('keeps each symbol’s drawings to itself (§114)', () => {
    const store = createChartDrawingStore('acc-1');
    store.add(drawing({ id: 'eur', symbol: 'EURUSD' }));
    store.add(drawing({ id: 'gold', symbol: 'XAUUSD' }));

    expect(store.list('EURUSD').map((entry) => entry.id)).toEqual(['eur']);
    expect(store.list('XAUUSD').map((entry) => entry.id)).toEqual(['gold']);
    expect(store.list('NAS100')).toEqual([]);
  });

  it('keeps each account’s drawings to itself (§79)', () => {
    createChartDrawingStore('acc-1').add(drawing({ id: 'first' }));
    const second = createChartDrawingStore('acc-2');
    expect(second.list('EURUSD')).toEqual([]);

    second.add(drawing({ id: 'second' }));
    expect(
      createChartDrawingStore('acc-1')
        .list('EURUSD')
        .map((e) => e.id),
    ).toEqual(['first']);
  });

  it('is shared across timeframes — one record, not one per interval (§54/§115)', () => {
    // Nothing in the stored shape mentions a timeframe, so a drawing made on 1m
    // is the same record read on 3m; there is no key to duplicate it under.
    const store = createChartDrawingStore('acc-1');
    store.add(drawing({ id: 'level' }));
    const stored = JSON.parse(window.localStorage.getItem(CHART_DRAWINGS_STORAGE_KEY) ?? '{}');
    expect(JSON.stringify(stored)).not.toContain('timeframe');
    expect(store.list('EURUSD')).toHaveLength(1);
  });

  it('bounds the number of drawings per symbol (§56)', () => {
    const store = createChartDrawingStore('acc-1');
    for (let index = 0; index < MAX_DRAWINGS_PER_SYMBOL + 10; index += 1) {
      store.add(drawing({ id: `d-${index}` }));
    }
    expect(store.list('EURUSD')).toHaveLength(MAX_DRAWINGS_PER_SYMBOL);
  });

  it('fails closed on a corrupt, truncated or foreign-version payload (§55)', () => {
    expect(parseStoredDrawings(null)).toEqual({});
    expect(parseStoredDrawings('not json')).toEqual({});
    expect(parseStoredDrawings('[]')).toEqual({});
    expect(parseStoredDrawings(JSON.stringify({ version: 99, accounts: {} }))).toEqual({});
    expect(parseStoredDrawings(JSON.stringify({ version: 1 }))).toEqual({});
  });

  it('drops only the malformed record, keeping its valid siblings', () => {
    window.localStorage.setItem(
      CHART_DRAWINGS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        accounts: {
          'acc-1': {
            EURUSD: [drawing({ id: 'good' }), { id: 'bad', type: 'text' }, drawing({ id: 'also' })],
          },
        },
      }),
    );
    expect(
      createChartDrawingStore('acc-1')
        .list('EURUSD')
        .map((e) => e.id),
    ).toEqual(['good', 'also']);
  });

  it('rejects a record filed under a symbol it does not claim (§114)', () => {
    window.localStorage.setItem(
      CHART_DRAWINGS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        accounts: { 'acc-1': { XAUUSD: [drawing({ id: 'smuggled', symbol: 'EURUSD' })] } },
      }),
    );
    expect(createChartDrawingStore('acc-1').list('XAUUSD')).toEqual([]);
  });

  it('does not throw when storage is unavailable', () => {
    const original = window.localStorage.getItem;
    Object.defineProperty(window.localStorage, 'getItem', {
      configurable: true,
      value: () => {
        throw new Error('storage disabled');
      },
    });
    expect(() => createChartDrawingStore('acc-1').list('EURUSD')).not.toThrow();
    Object.defineProperty(window.localStorage, 'getItem', {
      configurable: true,
      value: original,
    });
  });
});
