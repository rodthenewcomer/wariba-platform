'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AccountContext,
  Badge,
  BottomSheet,
  Button,
  cx,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  Input,
  RiskRibbon,
  Text,
  type RiskRibbonStatus,
} from '@wariba/ui';
import {
  formatSimulatedPrice,
  SIMULATED_SYMBOLS,
  useSimulatedMarket,
  type SimulatedMarket,
  type SimulatedSymbol,
} from './useSimulatedMarket';
import { useWariXAutoplay } from './useWariXAutoplay';
import { AnimatedAmount } from './AnimatedAmount';
import { WariXChart } from './WariXChart';

const NOMINAL_BALANCE = 10_000;
const DAILY_LOSS_LIMIT = 300; // WARIBA ONE v1.1 — 3 % of a 10K nominal balance
const MAXIMUM_LOSS = 1_000; // WARIBA ONE v1.1 — 10 % of a 10K nominal balance

// Illustrative demo contract sizes only — not the authoritative trading-engine
// contract spec (that lives in @wariba/domain for real accounts).
const CONTRACT_MULTIPLIER: Record<SimulatedSymbol, number> = {
  EURUSD: 100_000,
  GBPUSD: 100_000,
  USDJPY: 100_000,
  XAUUSD: 100,
  NAS100: 1,
};

interface DemoPosition {
  id: string;
  symbol: SimulatedSymbol;
  side: 'buy' | 'sell';
  quantity: number;
  entryPrice: number;
}

function floatingPnl(position: DemoPosition, market: SimulatedMarket): number {
  const quote = market[position.symbol];
  const markPrice = position.side === 'buy' ? quote.bid : quote.ask;
  const direction = position.side === 'buy' ? 1 : -1;
  return (markPrice - position.entryPrice) * position.quantity * CONTRACT_MULTIPLIER[position.symbol] * direction;
}

function formatSignedUsd(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toLocaleString('fr-FR')} USD`;
}

function formatUsd(value: number): string {
  return `${Math.round(value).toLocaleString('fr-FR')} USD`;
}

export function WariXTerminal() {
  const market = useSimulatedMarket();
  const [selectedSymbol, setSelectedSymbol] = useState<SimulatedSymbol>('EURUSD');
  const [quantity, setQuantity] = useState('0.10');
  const [positions, setPositions] = useState<DemoPosition[]>([]);
  const [realizedPnl, setRealizedPnl] = useState(0);
  const [ticketOpen, setTicketOpen] = useState(false);

  const quote = market[selectedSymbol];
  const totalFloatingPnl = positions.reduce((sum, position) => sum + floatingPnl(position, market), 0);
  const totalPnl = realizedPnl + totalFloatingPnl;
  const balance = NOMINAL_BALANCE + totalPnl;
  const dailyLossRemaining = Math.max(0, DAILY_LOSS_LIMIT + Math.min(0, totalPnl));
  const maximumLossRemaining = Math.max(0, MAXIMUM_LOSS + Math.min(0, totalPnl));
  const dailyLossRatio = dailyLossRemaining / DAILY_LOSS_LIMIT;
  const riskStatus: RiskRibbonStatus =
    dailyLossRemaining <= 0 ? 'soft-lock' : dailyLossRatio < 0.3 ? 'near-limit' : 'normal';

  function submitOrder(side: 'buy' | 'sell') {
    const parsedQuantity = Number.parseFloat(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) return;
    const entryPrice = side === 'buy' ? quote.ask : quote.bid;
    setPositions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        symbol: selectedSymbol,
        side,
        quantity: parsedQuantity,
        entryPrice,
      },
    ]);
    setTicketOpen(false);
  }

  function closePosition(id: string) {
    const position = positions.find((candidate) => candidate.id === id);
    if (!position) return;
    setRealizedPnl((prev) => prev + floatingPnl(position, market));
    setPositions((prev) => prev.filter((candidate) => candidate.id !== id));
  }

  function closeAllPositions() {
    setRealizedPnl((prev) => prev + totalFloatingPnl);
    setPositions([]);
  }

  const autoplay = useWariXAutoplay({
    onSelectSymbol: setSelectedSymbol,
    onBuy: () => submitOrder('buy'),
    onCloseAll: closeAllPositions,
  });

  function takeControl<T extends unknown[]>(action: (...args: T) => void) {
    return (...args: T) => {
      autoplay.pause();
      action(...args);
    };
  }

  const selectSymbol = takeControl(setSelectedSymbol);
  const buy = takeControl(() => submitOrder('buy'));
  const sell = takeControl(() => submitOrder('sell'));
  const close = takeControl(closePosition);
  const closeAll = takeControl(closeAllPositions);
  const openTicket = takeControl(() => setTicketOpen(true));

  const orderTicket = (
    <div className="flex flex-col gap-4">
      <Text variant="label-sm" color="tertiary">
        Ticket de démonstration — {selectedSymbol}
      </Text>
      <Input
        label="Quantité (lots)"
        type="text"
        name="quantity"
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
      />
      <Text variant="body-sm" color="secondary" className="wariba-data">
        Bid {formatSimulatedPrice(quote.bid, quote.decimals)} · Ask{' '}
        {formatSimulatedPrice(quote.ask, quote.decimals)}
      </Text>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={buy}>
          Achat
        </Button>
        <Button variant="secondary" className="flex-1" onClick={sell}>
          Vente
        </Button>
      </div>
      <Text variant="body-sm" color="tertiary">
        Compte de démonstration. En production, le serveur reste seul décisionnaire du prix — aucune
        exécution sur un prix erroné n’est possible.
      </Text>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="overflow-hidden rounded-[var(--wariba-radius-2xl)] border border-[color:var(--wariba-theme-border)] bg-[color:var(--wariba-theme-background)] shadow-[var(--wariba-shadow-lg)]"
    >
      <div className="flex flex-col gap-2 border-b border-[color:var(--wariba-theme-border)] p-[var(--wariba-component-trade-panel-padding)] sm:p-4">
        <Badge variant="information" className="inline-flex items-center gap-2 self-start">
          {!autoplay.paused && (
            <motion.span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-[color:var(--wariba-color-success-500)]"
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          {autoplay.paused
            ? 'Démonstration · vous avez la main'
            : 'Démonstration · pilotage automatique'}
        </Badge>
        <AccountContext
          program="WARIBA ONE"
          nominalFormatted={formatUsd(balance)}
          publicId="DEMO-0001"
          statusLabel="Démonstration"
          statusVariant="information"
        />
        <RiskRibbon
          status={riskStatus}
          dailyLossRemaining={formatUsd(dailyLossRemaining)}
          maximumLossRemaining={formatUsd(maximumLossRemaining)}
          nextResetLabel="00:00 UTC"
          connectionOk
        />
      </div>

      <div className="flex flex-col lg:flex-row">
        <aside className="flex flex-col gap-1 border-b border-[color:var(--wariba-theme-border)] p-[var(--wariba-component-trade-panel-padding)] lg:w-[var(--wariba-size-trade-watchlist-max)] lg:border-b-0 lg:border-r">
          <Text variant="label-sm" color="tertiary" className="mb-1">
            Watchlist
          </Text>
          {SIMULATED_SYMBOLS.map(({ symbol }) => {
            const symbolQuote = market[symbol];
            return (
              <button
                key={symbol}
                type="button"
                onClick={() => selectSymbol(symbol)}
                className={cx(
                  'flex items-center justify-between rounded-[var(--wariba-radius-sm)] px-2 py-2 text-left',
                  'transition-colors duration-300',
                  symbol === selectedSymbol && 'bg-[color:var(--wariba-background-selected)]',
                )}
              >
                <span className="text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-theme-text)]">
                  {symbol}
                </span>
                <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] text-[color:var(--wariba-text-secondary)]">
                  {formatSimulatedPrice(symbolQuote.bid, symbolQuote.decimals)} /{' '}
                  {formatSimulatedPrice(symbolQuote.ask, symbolQuote.decimals)}
                </span>
              </button>
            );
          })}
        </aside>

        <div className="flex min-h-[280px] flex-1 flex-col gap-2 border-b border-[color:var(--wariba-theme-border)] p-[var(--wariba-component-trade-panel-padding)] lg:border-b-0 lg:border-r">
          <WariXChart candles={quote.candles} />
          <Button variant="secondary" className="lg:hidden" onClick={openTicket}>
            Trader {selectedSymbol}
          </Button>
        </div>

        <aside className="hidden p-[var(--wariba-component-trade-panel-padding)] lg:flex lg:w-[var(--wariba-size-trade-order-ticket-max)] lg:flex-col">
          {orderTicket}
        </aside>
      </div>

      <BottomSheet
        open={ticketOpen}
        onClose={() => setTicketOpen(false)}
        title={`Trader ${selectedSymbol}`}
      >
        {orderTicket}
      </BottomSheet>

      <div className="border-t border-[color:var(--wariba-theme-border)] p-[var(--wariba-component-trade-panel-padding)] sm:p-4">
        <Text variant="label-sm" color="tertiary" className="mb-2">
          Positions (démonstration)
        </Text>
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Symbole</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Taille</DataTableHeaderCell>
              <DataTableHeaderCell align="right">PnL flottant</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Action</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {positions.length === 0 ? (
              <DataTableRow>
                <DataTableCell colSpan={4} className="text-center text-[color:var(--wariba-text-secondary)]">
                  Aucune position ouverte. Passez un ordre de démonstration ci-dessus.
                </DataTableCell>
              </DataTableRow>
            ) : (
              <AnimatePresence initial={false}>
                {positions.map((position) => (
                  <motion.tr
                    key={position.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-b border-[color:var(--wariba-border-subtle)] last:border-0"
                  >
                    <DataTableCell>
                      {position.symbol} · {position.side === 'buy' ? 'Achat' : 'Vente'}
                    </DataTableCell>
                    <DataTableCell numeric>{position.quantity}</DataTableCell>
                    <DataTableCell numeric>
                      <AnimatedAmount
                        value={floatingPnl(position, market)}
                        format={formatSignedUsd}
                        className="wariba-data"
                      />
                    </DataTableCell>
                    <DataTableCell align="right">
                      <Button variant="ghost" size="sm" onClick={() => close(position.id)}>
                        Fermer
                      </Button>
                    </DataTableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </DataTableBody>
        </DataTable>
        {positions.length > 0 ? (
          <Button variant="ghost" size="sm" className="mt-2" onClick={closeAll}>
            Tout fermer
          </Button>
        ) : null}
      </div>
    </motion.div>
  );
}
