'use client';

import { useEffect, useRef, useState } from 'react';
import type { SimulatedSymbol } from './useSimulatedMarket';

export interface WariXAutoplayHandlers {
  onSelectSymbol: (symbol: SimulatedSymbol) => void;
  onBuy: () => void;
  onCloseAll: () => void;
}

interface AutoplayStep {
  delayMs: number;
  run: (handlers: WariXAutoplayHandlers, symbol: SimulatedSymbol) => void;
}

const SEQUENCE_SYMBOLS: readonly SimulatedSymbol[] = ['EURUSD', 'XAUUSD', 'NAS100', 'GBPUSD'];

const STEPS: readonly AutoplayStep[] = [
  { delayMs: 600, run: (handlers, symbol) => handlers.onSelectSymbol(symbol) },
  { delayMs: 4200, run: (handlers) => handlers.onBuy() },
  { delayMs: 4200, run: (handlers) => handlers.onCloseAll() },
  { delayMs: 1800, run: () => undefined },
];

/**
 * Orchestrates a looping WariX demo sequence by calling the exact same
 * handlers a visitor's own click would trigger — no parallel fake logic, so
 * the "mockup" is genuinely running the terminal's real order/close code.
 * Stops permanently the moment `pause()` is called (first manual click).
 */
export function useWariXAutoplay(handlers: WariXAutoplayHandlers): {
  paused: boolean;
  pause: () => void;
} {
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let symbolIndex = 0;
    let stepIndex = 0;

    function scheduleNext() {
      if (pausedRef.current) return;
      const symbol = SEQUENCE_SYMBOLS[symbolIndex % SEQUENCE_SYMBOLS.length] as SimulatedSymbol;
      const step = STEPS[stepIndex] as AutoplayStep;
      timeoutId = setTimeout(() => {
        if (pausedRef.current) return;
        step.run(handlersRef.current, symbol);
        stepIndex = (stepIndex + 1) % STEPS.length;
        if (stepIndex === 0) symbolIndex += 1;
        scheduleNext();
      }, step.delayMs);
    }

    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, []);

  function pause() {
    pausedRef.current = true;
    setPaused(true);
  }

  return { paused, pause };
}
