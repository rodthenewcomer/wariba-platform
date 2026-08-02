'use client';

import {
  AccountContext,
  Button,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  RiskRibbon,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
} from '@wariba/ui';
import { useState } from 'react';

const SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'NAS100'] as const;

/**
 * Structural shell only — Design System §29 / §4.1 anti-vibe-code: no fake chart,
 * no fake prices. Market data and the order engine are Prompt 04/07's scope.
 */
export default function TradePage() {
  const [tab, setTab] = useState('positions');

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-col gap-2 border-b border-[color:var(--wariba-theme-border)] p-[var(--wariba-component-trade-panel-padding)]">
        <AccountContext
          program="WARIBA ONE"
          nominalFormatted="10 000 USD"
          publicId="DEMO-10K-001"
          statusLabel="Actif"
          statusVariant="success"
        />
        <RiskRibbon
          status="stale"
          dailyLossRemaining="—"
          maximumLossRemaining="—"
          nextResetLabel="00:00 UTC"
          connectionOk={false}
        />
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="flex flex-col gap-1 border-b border-[color:var(--wariba-theme-border)] p-[var(--wariba-component-trade-panel-padding)] lg:w-[var(--wariba-size-trade-watchlist-max)] lg:border-b-0 lg:border-r">
          <Text variant="label-sm" color="tertiary" className="mb-1">
            Watchlist
          </Text>
          {SYMBOLS.map((symbol) => (
            <button
              key={symbol}
              type="button"
              disabled
              className="flex items-center justify-between rounded-[var(--wariba-radius-sm)] px-2 py-2 text-left disabled:cursor-not-allowed"
            >
              <span className="text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-theme-text)]">
                {symbol}
              </span>
              <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] text-[color:var(--wariba-text-secondary)]">
                — / —
              </span>
            </button>
          ))}
        </aside>

        <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center gap-2 border-b border-[color:var(--wariba-theme-border)] p-[var(--wariba-component-trade-panel-padding)] lg:border-b-0 lg:border-r">
          <Text variant="body-md" color="secondary" className="text-center">
            Le graphique de marché sandbox arrive avec Prompt 04 (Trading Core).
          </Text>
          <Text variant="body-sm" color="tertiary" className="text-center">
            Aucun prix affiché ici n&apos;est réel.
          </Text>
        </div>

        <aside className="flex flex-col gap-4 p-[var(--wariba-component-trade-panel-padding)] lg:w-[var(--wariba-size-trade-order-ticket-max)]">
          <Text variant="label-sm" color="tertiary">
            Order Ticket
          </Text>
          <div className="flex gap-2">
            <Button variant="secondary" disabled className="flex-1">
              Buy
            </Button>
            <Button variant="secondary" disabled className="flex-1">
              Sell
            </Button>
          </div>
          <Text variant="body-sm" color="tertiary">
            L&apos;exécution serveur arrive avec Prompt 04. Aucun ordre soumis ici n&apos;est réel.
          </Text>
        </aside>
      </div>

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
                  <DataTableHeaderCell align="right">PnL</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                <DataTableRow>
                  <DataTableCell
                    colSpan={3}
                    className="text-center text-[color:var(--wariba-text-secondary)]"
                  >
                    Aucune position ouverte.
                  </DataTableCell>
                </DataTableRow>
              </DataTableBody>
            </DataTable>
          </TabPanel>
          <TabPanel value="orders">
            <Text variant="body-sm" color="tertiary">
              Aucun ordre.
            </Text>
          </TabPanel>
          <TabPanel value="history">
            <Text variant="body-sm" color="tertiary">
              Aucun historique.
            </Text>
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}
