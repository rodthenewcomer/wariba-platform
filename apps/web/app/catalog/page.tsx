'use client';

import {
  AccountContext,
  Alert,
  Badge,
  BottomSheet,
  Button,
  Card,
  Checkbox,
  ConsistencyMeter,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  Dialog,
  EmptyState,
  EvidencePanel,
  ExecutionState,
  Input,
  MissionProgress,
  PayoutBreakdown,
  PolicyVersionChip,
  QualifiedDaysTracker,
  Radio,
  ReserveCoverage,
  RiskRibbon,
  Select,
  Skeleton,
  Stack,
  Switch,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
  Tooltip,
  WarixSymbolSpecimen,
} from '@wariba/ui';
import { useState } from 'react';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-[color:var(--wariba-border-subtle)] pb-10">
      <Text as="h2" variant="heading-md">
        {title}
      </Text>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  );
}

/**
 * Internal component catalog — Design System §49. Not part of the trader/staff
 * navigation, no data-fetching, no route-group chrome. `pnpm dev` then visit
 * /catalog. Every component below is exercised in at least one non-default state.
 */
export default function CatalogPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [switchOn, setSwitchOn] = useState(true);
  const [tab, setTab] = useState('one');

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10">
      <div>
        <Text as="h1" variant="display-md">
          WARIBA Component Catalog
        </Text>
        <Text variant="body-md" color="secondary">
          Internal reference — Design System v1.0. Not linked from any user-facing navigation.
        </Text>
      </div>

      <WarixSymbolSpecimen />

      <Section title="Buttons">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="tertiary">Tertiary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="text">Text link</Button>
        <Button loading>Loading</Button>
        <Button disabled>Disabled</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
      </Section>

      <Section title="Forms">
        <Input label="Email" type="email" placeholder="vous@exemple.com" />
        <Input label="Avec erreur" errorText="Cette adresse est déjà utilisée." />
        <Input label="Montant" suffix="USD" />
        <Select label="Pays" defaultValue="ci">
          <option value="ci">Côte d&apos;Ivoire</option>
          <option value="sn">Sénégal</option>
        </Select>
        <Stack gap="2">
          <Checkbox label="J'accepte les conditions" helperText="Jamais précoché par défaut." />
          <Radio label="10K" name="size" />
          <Switch
            label="Notifications critiques"
            checked={switchOn}
            onCheckedChange={setSwitchOn}
          />
        </Stack>
      </Section>

      <Section title="Feedback">
        <Badge>Neutral</Badge>
        <Badge variant="information">Information</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="danger">Danger</Badge>
        <Badge variant="review">Review</Badge>
      </Section>

      <Section title="Alerts">
        <div className="flex w-full flex-col gap-3">
          <Alert level="information" title="Information">
            Message informatif standard.
          </Alert>
          <Alert level="success" title="Succès">
            Action complétée.
          </Alert>
          <Alert level="warning" title="Attention">
            Action requise avant de continuer.
          </Alert>
          <Alert level="danger" title="Erreur" onDismiss={() => {}}>
            Une erreur bloquante, avec fermeture.
          </Alert>
        </div>
      </Section>

      <Section title="Overlays">
        <Button onClick={() => setDialogOpen(true)}>Ouvrir Dialog</Button>
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Confirmer l'action"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={() => setDialogOpen(false)}>Confirmer</Button>
            </>
          }
        >
          <Text variant="body-sm">
            Contenu du dialogue — réservé aux décisions qui exigent interruption.
          </Text>
        </Dialog>

        <Button onClick={() => setSheetOpen(true)}>Ouvrir BottomSheet</Button>
        <BottomSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Order Ticket mobile"
        >
          <Text variant="body-sm">Contenu du bottom sheet.</Text>
        </BottomSheet>

        <Tooltip label="Aide courte, jamais l'unique canal d'information obligatoire.">
          <Button variant="ghost">Survoler pour tooltip</Button>
        </Tooltip>
      </Section>

      <Section title="Tabs">
        <div className="w-full">
          <Tabs value={tab} onValueChange={setTab}>
            <TabList aria-label="Exemple">
              <Tab value="one">Un</Tab>
              <Tab value="two">Deux</Tab>
            </TabList>
            <TabPanel value="one">Panneau un.</TabPanel>
            <TabPanel value="two">Panneau deux.</TabPanel>
          </Tabs>
        </div>
      </Section>

      <Section title="Cards, Skeleton, EmptyState">
        <Card className="w-64">
          <Text variant="body-sm">Card par défaut, sans ombre (Design System §10).</Text>
        </Card>
        <div className="flex w-64 flex-col gap-2">
          <Skeleton height="1.25rem" width="60%" />
          <Skeleton height="1rem" />
          <Skeleton height="1rem" width="80%" />
        </div>
        <div className="w-72">
          <EmptyState
            title="Aucune donnée"
            description="Explication courte + action."
            action={<Button size="sm">Action</Button>}
          />
        </div>
      </Section>

      <Section title="DataTable">
        <div className="w-full">
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
                <DataTableCell>EURUSD</DataTableCell>
                <DataTableCell numeric>0.10</DataTableCell>
                <DataTableCell numeric>+12.40</DataTableCell>
              </DataTableRow>
            </DataTableBody>
          </DataTable>
        </div>
      </Section>

      <Section title="WARIBA — AccountContext, ExecutionState, PolicyVersionChip">
        <AccountContext
          program="WARIBA ONE"
          nominalFormatted="10 000 USD"
          publicId="DEMO-10K-001"
          statusLabel="Actif"
          statusVariant="success"
        />
        <Stack direction="row" gap="4">
          <ExecutionState state="preparing" />
          <ExecutionState state="sending" />
          <ExecutionState state="filled" />
          <ExecutionState state="rejected" />
        </Stack>
        <PolicyVersionChip version="1.1.1" status="published" effectiveDateLabel="5 août 2026" />
      </Section>

      <Section title="WARIBA — RiskRibbon (all statuses)">
        <div className="flex w-full flex-col gap-2">
          {(
            ['normal', 'attention', 'near-limit', 'soft-lock', 'hard-breach', 'stale'] as const
          ).map((status) => (
            <RiskRibbon
              key={status}
              status={status}
              dailyLossRemaining="120 USD"
              maximumLossRemaining="640 USD"
              nextResetLabel="00:00 UTC"
              connectionOk={status !== 'stale'}
            />
          ))}
        </div>
      </Section>

      <Section title="WARIBA — MissionProgress, Best Day, Performance Days">
        <div className="w-96">
          <MissionProgress
            variant="evaluation"
            state="active"
            title="WARIBA ONE — 10 000 USD"
            progressPercent={72}
            conditions={[
              { label: 'Objectif réalisé (10 %)', detail: '720 / 1 000 USD', met: false },
              { label: 'Best Day Rule (50 %)', detail: '48 %', met: true },
            ]}
            nextAction={<Text variant="body-sm">Continuer.</Text>}
          />
        </div>
        <div className="w-80">
          <ConsistencyMeter
            ratioPercent={50}
            limitPercent={40}
            bestDayFormatted="400 USD"
            totalProfitFormatted="800 USD"
            requiredProfitFormatted="1000 USD"
          />
        </div>
        <div className="w-80">
          <QualifiedDaysTracker
            requiredCount={3}
            qualifiedCount={1}
            thresholdFormatted="20 USD"
            days={[
              { dateLabel: '1 août', qualified: true, finalized: true, netPnlFormatted: '+45 USD' },
              {
                dateLabel: '2 août',
                qualified: false,
                finalized: true,
                netPnlFormatted: '-10 USD',
              },
              { dateLabel: '3 août', qualified: false, finalized: false, netPnlFormatted: '—' },
            ]}
          />
        </div>
      </Section>

      <Section title="WARIBA — PayoutBreakdown, EvidencePanel, ReserveCoverage">
        <div className="w-96">
          <PayoutBreakdown
            rows={[
              { label: 'Profit net du cycle', valueFormatted: '500 USD' },
              { label: 'Limite 50 %', valueFormatted: '250 USD' },
              { label: 'Cap applicable', valueFormatted: '200 USD' },
              { label: 'Payout Base', valueFormatted: '200 USD' },
              { label: 'Split trader', valueFormatted: '80 %' },
            ]}
            traderCashLabel="Trader Cash"
            traderCashFormatted="160 USD"
            estimateDisclaimer="Estimation — le montant final est figé lors de la demande."
          />
        </div>
        <div className="w-96">
          <EvidencePanel
            ruleCode="RISK-DLL-LOCK"
            ruleLabel="Limite de perte quotidienne"
            thresholdFormatted="400 USD"
            observedValueFormatted="400 USD"
            timestampLabel="1 août 2026, 15:42 UTC"
            events={[{ timestampLabel: '15:42:01', description: 'Ordre EURUSD clôturé.' }]}
            consequence="Nouveaux ordres bloqués jusqu'au prochain reset."
          />
        </div>
        <div className="w-80">
          <ReserveCoverage
            reserveFormatted="12 000 USD"
            projectedPayouts30dFormatted="5 000 USD"
            coverageRatioFormatted="2.4x"
            zone="normal"
          />
        </div>
      </Section>
    </div>
  );
}
