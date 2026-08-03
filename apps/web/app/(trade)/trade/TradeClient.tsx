'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccountContext,
  Alert,
  BottomSheet,
  Button,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  Input,
  RiskRibbon,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
} from '@wariba/ui';
import {
  accountStateChannel,
  accountOrdersChannel,
  accountPositionsChannel,
  marketSymbolChannel,
  type AccountSnapshot,
  type MarketTick,
  type OrderResultMessage,
  type TradableSymbol,
} from '@wariba/contracts';
import { RealtimeClient, type RealtimeConnectionState } from '../../../lib/realtime-client';
import { createSupabaseBrowserClient } from '../../../lib/supabase/browser';
import { PriceChart } from './PriceChart';

const SYMBOLS: TradableSymbol[] = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'NAS100'];

async function getAccessToken(): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export function TradeClient({ accountId, wsUrl }: { accountId: string; wsUrl: string }) {
  const clientRef = useRef<RealtimeClient | null>(null);
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('connecting');
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null);
  const [ticks, setTicks] = useState<Partial<Record<TradableSymbol, MarketTick>>>({});
  const [selectedSymbol, setSelectedSymbol] = useState<TradableSymbol>('EURUSD');
  const [quantity, setQuantity] = useState('0.10');
  const [pending, setPending] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [tab, setTab] = useState('positions');
  const [ticketOpen, setTicketOpen] = useState(false);

  useEffect(() => {
    const client = new RealtimeClient(wsUrl, getAccessToken);
    clientRef.current = client;

    const offState = client.onStateChange(setConnectionState);
    const offMessage = client.onMessage((envelope) => {
      if (envelope.type === 'account.snapshot') {
        setSnapshot(envelope.payload as AccountSnapshot);
      } else if (envelope.type === 'market.tick') {
        const tick = envelope.payload as MarketTick;
        setTicks((prev) => ({ ...prev, [tick.symbol]: tick }));
      } else if (envelope.type === 'order_result') {
        const result = envelope.payload as OrderResultMessage;
        setPending(false);
        if (result.status === 'rejected') {
          setOrderError(result.rejectionCode ?? 'unknown_error');
        } else {
          setOrderError(null);
        }
        // Server always answers a (re)subscribe with a fresh full snapshot —
        // simplest correct way to pick up the new position/order/balance.
        client.subscribe([accountStateChannel(accountId)]);
      } else if (envelope.type === 'error') {
        setPending(false);
        const payload = envelope.payload as { code: string; message: string };
        setOrderError(payload.code);
      }
    });

    void client.connect().then(() => {
      client.subscribe([
        accountStateChannel(accountId),
        accountOrdersChannel(accountId),
        accountPositionsChannel(accountId),
        ...SYMBOLS.map((s) => marketSymbolChannel(s)),
      ]);
    });

    return () => {
      offState();
      offMessage();
      client.close();
    };
  }, [accountId, wsUrl]);

  const selectedTick = ticks[selectedSymbol] ?? null;
  const isStale = selectedTick?.marketStatus === 'stale';
  const connectionOk = connectionState === 'open';

  const submitMarketOrder = useCallback(
    (side: 'buy' | 'sell') => {
      if (!clientRef.current) return;
      setPending(true);
      setOrderError(null);
      clientRef.current.submitOrder({
        orderType: 'market_open',
        accountId,
        idempotencyKey: crypto.randomUUID(),
        symbol: selectedSymbol,
        side,
        quantity,
      });
    },
    [accountId, selectedSymbol, quantity],
  );

  const closePosition = useCallback(
    (positionId: string) => {
      if (!clientRef.current) return;
      setPending(true);
      clientRef.current.submitOrder({
        orderType: 'full_close',
        accountId,
        idempotencyKey: crypto.randomUUID(),
        positionId,
      });
    },
    [accountId],
  );

  const closeAll = useCallback(() => {
    if (!clientRef.current) return;
    setPending(true);
    clientRef.current.closeAll({ accountId, idempotencyKey: crypto.randomUUID() });
  }, [accountId]);

  const orderTicket = useMemo(
    () => (
      <div className="flex flex-col gap-4">
        <Text variant="label-sm" color="tertiary">
          Order Ticket — {selectedSymbol}
        </Text>
        <Input
          label="Quantité (lots)"
          type="text"
          name="quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        {selectedTick && (
          <Text variant="body-sm" color="secondary" className="wariba-data">
            Bid {selectedTick.bid} · Ask {selectedTick.ask}
          </Text>
        )}
        {orderError && (
          <Alert level="danger" title="Ordre refusé">
            {orderError}
          </Alert>
        )}
        {isStale && (
          <Alert level="warning" title="Prix obsolète">
            Les nouvelles positions sont bloquées tant que le marché n&apos;est pas à jour.
          </Alert>
        )}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            loading={pending}
            disabled={!connectionOk || isStale}
            onClick={() => submitMarketOrder('buy')}
            className="flex-1"
          >
            Buy
          </Button>
          <Button
            variant="secondary"
            loading={pending}
            disabled={!connectionOk || isStale}
            onClick={() => submitMarketOrder('sell')}
            className="flex-1"
          >
            Sell
          </Button>
        </div>
        <Text variant="body-sm" color="tertiary">
          Compte simulé. Exécution serveur uniquement — aucun prix client n&apos;est jamais
          autoritaire.
        </Text>
      </div>
    ),
    [
      selectedSymbol,
      quantity,
      selectedTick,
      orderError,
      isStale,
      pending,
      connectionOk,
      submitMarketOrder,
    ],
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-col gap-2 border-b border-[color:var(--wariba-theme-border)] p-[var(--wariba-component-trade-panel-padding)]">
        <AccountContext
          program="WARIBA ONE"
          nominalFormatted={snapshot ? `${snapshot.balance} USD` : '—'}
          publicId={accountId.slice(0, 8).toUpperCase()}
          statusLabel={connectionOk ? 'Actif' : 'Connexion...'}
          statusVariant={connectionOk ? 'success' : 'warning'}
        />
        <RiskRibbon
          status={isStale ? 'stale' : 'normal'}
          dailyLossRemaining="—"
          maximumLossRemaining="—"
          nextResetLabel="00:00 UTC"
          connectionOk={connectionOk}
        />
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="flex flex-col gap-1 border-b border-[color:var(--wariba-theme-border)] p-[var(--wariba-component-trade-panel-padding)] lg:w-[var(--wariba-size-trade-watchlist-max)] lg:border-b-0 lg:border-r">
          <Text variant="label-sm" color="tertiary" className="mb-1">
            Watchlist
          </Text>
          {SYMBOLS.map((symbol) => {
            const t = ticks[symbol];
            return (
              <button
                key={symbol}
                type="button"
                onClick={() => setSelectedSymbol(symbol)}
                className={`flex items-center justify-between rounded-[var(--wariba-radius-sm)] px-2 py-2 text-left ${
                  symbol === selectedSymbol ? 'bg-[color:var(--wariba-surface-selected)]' : ''
                }`}
              >
                <span className="text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-theme-text)]">
                  {symbol}
                </span>
                <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] text-[color:var(--wariba-text-secondary)]">
                  {t ? `${t.bid} / ${t.ask}` : '— / —'}
                </span>
              </button>
            );
          })}
        </aside>

        <div className="flex min-h-[280px] flex-1 flex-col gap-2 border-b border-[color:var(--wariba-theme-border)] p-[var(--wariba-component-trade-panel-padding)] lg:border-b-0 lg:border-r">
          <PriceChart tick={selectedTick} />
          <Button variant="secondary" className="lg:hidden" onClick={() => setTicketOpen(true)}>
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

      <div className="border-t border-[color:var(--wariba-theme-border)] p-[var(--wariba-component-trade-panel-padding)]">
        <Tabs value={tab} onValueChange={setTab}>
          <TabList aria-label="Compte">
            <Tab value="positions">Positions</Tab>
            <Tab value="orders">Ordres</Tab>
            <Tab value="history">Historique</Tab>
          </TabList>
          <TabPanel value="positions">
            <DataTable>
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeaderCell>Symbole</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Taille</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">PnL réalisé</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Action</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {!snapshot || snapshot.openPositions.length === 0 ? (
                  <DataTableRow>
                    <DataTableCell
                      colSpan={4}
                      className="text-center text-[color:var(--wariba-text-secondary)]"
                    >
                      Aucune position ouverte.
                    </DataTableCell>
                  </DataTableRow>
                ) : (
                  snapshot.openPositions.map((p) => (
                    <DataTableRow key={p.id}>
                      <DataTableCell>
                        {p.symbol} · {p.side === 'buy' ? 'Achat' : 'Vente'}
                      </DataTableCell>
                      <DataTableCell align="right" className="wariba-data">
                        {p.openQuantity}
                      </DataTableCell>
                      <DataTableCell align="right" className="wariba-data">
                        {p.realizedPnl}
                      </DataTableCell>
                      <DataTableCell align="right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => closePosition(p.id)}
                          disabled={pending}
                        >
                          Fermer
                        </Button>
                      </DataTableCell>
                    </DataTableRow>
                  ))
                )}
              </DataTableBody>
            </DataTable>
            {snapshot && snapshot.openPositions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={closeAll}
                disabled={pending}
              >
                Tout fermer
              </Button>
            )}
          </TabPanel>
          <TabPanel value="orders">
            <DataTable>
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeaderCell>Type</DataTableHeaderCell>
                  <DataTableHeaderCell>Symbole</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Statut</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {!snapshot || snapshot.recentOrders.length === 0 ? (
                  <DataTableRow>
                    <DataTableCell
                      colSpan={3}
                      className="text-center text-[color:var(--wariba-text-secondary)]"
                    >
                      Aucun ordre.
                    </DataTableCell>
                  </DataTableRow>
                ) : (
                  snapshot.recentOrders.map((o) => (
                    <DataTableRow key={o.id}>
                      <DataTableCell>{o.orderType}</DataTableCell>
                      <DataTableCell>{o.symbol ?? '—'}</DataTableCell>
                      <DataTableCell align="right">{o.status}</DataTableCell>
                    </DataTableRow>
                  ))
                )}
              </DataTableBody>
            </DataTable>
          </TabPanel>
          <TabPanel value="history">
            <Text variant="body-sm" color="tertiary">
              L&apos;historique complet arrive avec Prompt 07.
            </Text>
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}
