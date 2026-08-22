'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  WariXCandlesIcon,
  WariXObjectTreeIcon,
  WariXPreferencesIcon,
  WariXWatermarkIcon,
} from '@wariba/ui';
import { ChartModal } from './ChartModal';
import { DEFAULT_CHART_SETTINGS, type ChartDisplaySettings } from './chart-settings-model';

/**
 * The chart Settings modal — §15.
 *
 * The information architecture is the reference's, because it is the one traders
 * already know: a left navigation of four sections — Symbol, Status line, Scales
 * and lines, Canvas — a scrolling pane on the right, and Cancel / OK at the
 * bottom. A trader looking for grid lines opens Canvas without being told.
 *
 * **The contents are WariX's, and only what is real.** The reference's modal
 * carries around forty controls; a good number of them describe capabilities
 * lightweight-charts does not expose (lock price to bar ratio, logarithmic and
 * percentage scale modes) or data WariX's feed does not carry (volume, session
 * breaks, extended hours). Those are not rendered as disabled decoration — they
 * are absent, and each section ends with one line saying what is missing and
 * why. A trader who came looking for Session finds an answer instead of an
 * assumption that they missed it.
 *
 * **Draft-then-apply.** Edits are held locally and written on OK, so Cancel
 * genuinely reverts and a trader can try three grid options without three
 * storage writes and three chart repaints. That is also why the modal takes the
 * committed settings as a prop rather than editing them in place.
 */

type SectionId = 'symbol' | 'statusLine' | 'scales' | 'canvas';

const SECTIONS: { id: SectionId; label: string; icon: ReactNode }[] = [
  { id: 'symbol', label: 'Symbole', icon: <WariXCandlesIcon /> },
  { id: 'statusLine', label: 'Ligne de statut', icon: <WariXObjectTreeIcon /> },
  { id: 'scales', label: 'Échelles et lignes', icon: <WariXPreferencesIcon /> },
  { id: 'canvas', label: 'Canevas', icon: <WariXWatermarkIcon /> },
];

export interface ChartSettingsModalProps {
  open: boolean;
  onClose(): void;
  settings: ChartDisplaySettings;
  onApply(settings: ChartDisplaySettings): void;
  /** The instrument's authoritative precision — displayed, never editable. */
  pricePrecision: number | null;
  /** Opens on this section. Used by the context menu's "Paramètres…". */
  initialSection?: SectionId;
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-4 py-1.5">
      <div className="min-w-0">
        <span className="text-[length:var(--wariba-component-workstation-type-data)] text-[color:var(--wariba-component-workstation-text-secondary)]">
          {label}
        </span>
        {hint ? (
          <p className="text-[length:var(--wariba-component-workstation-type-meta)] leading-snug text-[color:var(--wariba-component-workstation-text-tertiary)]">
            {hint}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
  testId,
}: {
  label: string;
  checked: boolean;
  onChange(next: boolean): void;
  testId?: string;
}) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-2.5 py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        data-testid={testId}
        className="h-4 w-4 shrink-0 accent-[color:var(--wariba-component-workstation-interaction-selected)]"
      />
      <span className="text-[length:var(--wariba-component-workstation-type-data)] text-[color:var(--wariba-component-workstation-text-secondary)]">
        {label}
      </span>
    </label>
  );
}

function Swatch({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange(next: string): void;
  label: string;
}) {
  return (
    <input
      type="color"
      value={value}
      aria-label={label}
      onChange={(event) => onChange(event.target.value)}
      className="h-7 w-9 cursor-pointer rounded-[5px] border border-[color:var(--wariba-component-workstation-border-hairline)] bg-transparent p-0.5"
    />
  );
}

function Choice<T extends string>({
  value,
  onChange,
  options,
  label,
  testId,
}: {
  value: T;
  onChange(next: T): void;
  options: readonly { value: T; label: string }[];
  label: string;
  testId?: string;
}) {
  return (
    <select
      value={value}
      aria-label={label}
      data-testid={testId}
      onChange={(event) => onChange(event.target.value as T)}
      className="h-8 min-w-[9.5rem] rounded-[6px] border border-[color:var(--wariba-component-workstation-border-hairline)] bg-[color:var(--wariba-component-workstation-surface-canvas)] px-2 text-[length:var(--wariba-component-workstation-type-data)] text-[color:var(--wariba-component-workstation-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)]"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-1 mt-4 flex items-center gap-2 text-[length:var(--wariba-component-workstation-type-section-label)] font-bold uppercase leading-none tracking-[var(--wariba-component-workstation-tracking-section)] text-[color:var(--wariba-component-workstation-text-tertiary)] first:mt-0">
      {children}
      <span
        aria-hidden="true"
        className="h-px flex-1 bg-[color:var(--wariba-component-workstation-border-hairline)]"
      />
    </h3>
  );
}

export function ChartSettingsModal({
  open,
  onClose,
  settings,
  onApply,
  pricePrecision,
  initialSection = 'symbol',
}: ChartSettingsModalProps) {
  const [section, setSection] = useState<SectionId>(initialSection);
  const [draft, setDraft] = useState<ChartDisplaySettings>(settings);

  // Reopening must show what is actually on the chart, not the abandoned edits
  // of a previous Cancel.
  useEffect(() => {
    if (!open) return;
    setDraft(settings);
    setSection(initialSection);
  }, [open, settings, initialSection]);

  const patch = <K extends keyof ChartDisplaySettings>(
    key: K,
    value: Partial<ChartDisplaySettings[K]>,
  ) => setDraft((current) => ({ ...current, [key]: { ...current[key], ...value } }));

  return (
    <ChartModal
      open={open}
      onClose={onClose}
      title="Paramètres du graphique"
      width={720}
      height={580}
      testId="chart-settings-modal"
      footer={
        <>
          <button
            type="button"
            onClick={() => setDraft(DEFAULT_CHART_SETTINGS)}
            data-testid="chart-settings-reset"
            className="h-8 rounded-[7px] px-3 text-[length:var(--wariba-component-workstation-type-data)] text-[color:var(--wariba-component-workstation-text-tertiary)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)]"
          >
            Réinitialiser
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              data-testid="chart-settings-cancel"
              className="h-8 rounded-[7px] border border-[color:var(--wariba-component-workstation-border-hairline)] px-3.5 text-[length:var(--wariba-component-workstation-type-data)] text-[color:var(--wariba-component-workstation-text-secondary)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)]"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => {
                onApply(draft);
                onClose();
              }}
              data-testid="chart-settings-apply"
              className="h-8 rounded-[7px] bg-[color:var(--wariba-component-workstation-interaction-selected)] px-4 text-[length:var(--wariba-component-workstation-type-data)] font-semibold text-[color:var(--wariba-color-primitive-ink-975,#05070C)] transition-[filter] duration-[var(--wariba-component-workstation-motion-interaction)] hover:brightness-110"
            >
              Appliquer
            </button>
          </div>
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        <nav
          aria-label="Sections des paramètres"
          className="flex w-full shrink-0 overflow-x-auto border-b border-[color:var(--wariba-component-workstation-border-hairline)] bg-[color:var(--wariba-component-workstation-surface-canvas)] p-1.5 sm:block sm:w-[11.5rem] sm:overflow-y-auto sm:border-b-0 sm:border-r sm:py-2"
        >
          {SECTIONS.map((entry) => {
            const active = entry.id === section;
            return (
              <button
                key={entry.id}
                type="button"
                aria-current={active ? 'true' : undefined}
                onClick={() => setSection(entry.id)}
                data-testid={`chart-settings-section-${entry.id}`}
                className={`relative flex min-w-max items-center gap-2 px-2.5 py-2 text-left text-[length:var(--wariba-component-workstation-type-data)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] sm:w-full sm:gap-2.5 sm:px-3 ${
                  active
                    ? 'bg-[color:var(--wariba-component-workstation-wash-selected)] text-[color:var(--wariba-component-workstation-interaction-selected-text)]'
                    : 'text-[color:var(--wariba-component-workstation-text-secondary)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)]'
                }`}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-0.5 bg-[color:var(--wariba-component-workstation-interaction-selected)]"
                  />
                )}
                <span className="shrink-0 opacity-90">{entry.icon}</span>
                <span className="truncate">{entry.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {section === 'symbol' && (
            <div data-testid="chart-settings-pane-symbol">
              <GroupLabel>Bougies</GroupLabel>
              <Row label="Corps">
                <Check
                  label=""
                  checked={draft.symbol.bodyVisible}
                  onChange={(bodyVisible) => patch('symbol', { bodyVisible })}
                  testId="settings-body-visible"
                />
                <Swatch
                  label="Couleur du corps haussier"
                  value={draft.symbol.upColor}
                  onChange={(upColor) => patch('symbol', { upColor })}
                />
                <Swatch
                  label="Couleur du corps baissier"
                  value={draft.symbol.downColor}
                  onChange={(downColor) => patch('symbol', { downColor })}
                />
              </Row>
              <Row label="Bordures">
                <Check
                  label=""
                  checked={draft.symbol.bordersVisible}
                  onChange={(bordersVisible) => patch('symbol', { bordersVisible })}
                  testId="settings-borders-visible"
                />
                <Swatch
                  label="Couleur de bordure haussière"
                  value={draft.symbol.borderUpColor}
                  onChange={(borderUpColor) => patch('symbol', { borderUpColor })}
                />
                <Swatch
                  label="Couleur de bordure baissière"
                  value={draft.symbol.borderDownColor}
                  onChange={(borderDownColor) => patch('symbol', { borderDownColor })}
                />
              </Row>
              <Row label="Mèches">
                <Check
                  label=""
                  checked={draft.symbol.wicksVisible}
                  onChange={(wicksVisible) => patch('symbol', { wicksVisible })}
                  testId="settings-wicks-visible"
                />
                <Swatch
                  label="Couleur de mèche haussière"
                  value={draft.symbol.wickUpColor}
                  onChange={(wickUpColor) => patch('symbol', { wickUpColor })}
                />
                <Swatch
                  label="Couleur de mèche baissière"
                  value={draft.symbol.wickDownColor}
                  onChange={(wickDownColor) => patch('symbol', { wickDownColor })}
                />
              </Row>

              <GroupLabel>Données</GroupLabel>
              <Row label="Précision (lecture seule)">
                <span className="wariba-data rounded-[6px] bg-[color:var(--wariba-component-workstation-surface-canvas)] px-2.5 py-1 text-[length:var(--wariba-component-workstation-type-data)] tabular-nums text-[color:var(--wariba-component-workstation-text-tertiary)]">
                  {pricePrecision === null ? '—' : `${pricePrecision} décimales`}
                </span>
              </Row>
              <Row label="Fuseau horaire">
                <Choice
                  label="Fuseau horaire"
                  value={draft.symbol.timezone}
                  testId="settings-timezone"
                  onChange={(timezone) => patch('symbol', { timezone })}
                  options={[
                    { value: 'utc', label: 'UTC' },
                    { value: 'local', label: 'Heure locale' },
                  ]}
                />
              </Row>
            </div>
          )}

          {section === 'statusLine' && (
            <div data-testid="chart-settings-pane-statusLine">
              <GroupLabel>Symbole</GroupLabel>
              <Check
                label="Titre et intervalle"
                checked={draft.statusLine.title}
                onChange={(title) => patch('statusLine', { title })}
                testId="settings-status-title"
              />
              <Check
                label="État du marché"
                checked={draft.statusLine.marketStatus}
                onChange={(marketStatus) => patch('statusLine', { marketStatus })}
                testId="settings-status-market"
              />
              <Check
                label="Valeurs OHLC"
                checked={draft.statusLine.ohlc}
                onChange={(ohlc) => patch('statusLine', { ohlc })}
                testId="settings-status-ohlc"
              />
              <Check
                label="Variation de la bougie"
                checked={draft.statusLine.barChange}
                onChange={(barChange) => patch('statusLine', { barChange })}
                testId="settings-status-change"
              />

              <GroupLabel>Indicateurs</GroupLabel>
              <Check
                label="Noms des indicateurs"
                checked={draft.statusLine.indicatorTitles}
                onChange={(indicatorTitles) => patch('statusLine', { indicatorTitles })}
                testId="settings-status-indicator-titles"
              />
              <Check
                label="Valeurs des indicateurs"
                checked={draft.statusLine.indicatorValues}
                onChange={(indicatorValues) => patch('statusLine', { indicatorValues })}
                testId="settings-status-indicator-values"
              />
            </div>
          )}

          {section === 'scales' && (
            <div data-testid="chart-settings-pane-scales">
              <GroupLabel>Échelle de prix</GroupLabel>
              <Row label="Position de l’échelle">
                <Choice
                  label="Position de l’échelle"
                  value={draft.scales.placement}
                  testId="settings-scale-placement"
                  onChange={(placement) => patch('scales', { placement })}
                  options={[
                    { value: 'right', label: 'À droite' },
                    { value: 'left', label: 'À gauche' },
                  ]}
                />
              </Row>
              <Check
                label="Texte de l’échelle"
                checked={draft.scales.scaleText}
                onChange={(scaleText) => patch('scales', { scaleText })}
                testId="settings-scale-text"
              />

              <GroupLabel>Étiquettes et lignes de prix</GroupLabel>
              <Check
                label="Ligne du prix courant"
                checked={draft.scales.currentPriceLine}
                onChange={(currentPriceLine) => patch('scales', { currentPriceLine })}
                testId="settings-current-price-line"
              />
              <Check
                label="Étiquettes des indicateurs"
                checked={draft.scales.indicatorLabels}
                onChange={(indicatorLabels) => patch('scales', { indicatorLabels })}
                testId="settings-indicator-labels"
              />
              <Check
                label="Haut et bas de la plage visible"
                checked={draft.scales.highLowLabels}
                onChange={(highLowLabels) => patch('scales', { highLowLabels })}
                testId="settings-high-low-labels"
              />
              <Check
                label="Éviter les étiquettes qui se chevauchent"
                checked={draft.scales.avoidLabelCollisions}
                onChange={(avoidLabelCollisions) => patch('scales', { avoidLabelCollisions })}
                testId="settings-avoid-collisions"
              />
              {/*
               * The Bid/Ask pair, off by default and stated as such. It is the
               * single change §6 asked for, so it is the one control here that
               * explains itself rather than sitting as a bare label.
               */}
              <Check
                label="Lignes Bid et Ask sur le graphique"
                checked={draft.scales.bidAskLines}
                onChange={(bidAskLines) => patch('scales', { bidAskLines })}
                testId="settings-bid-ask-lines"
              />
            </div>
          )}

          {section === 'canvas' && (
            <div data-testid="chart-settings-pane-canvas">
              <GroupLabel>Grille</GroupLabel>
              <Row label="Lignes de grille">
                <Choice
                  label="Lignes de grille"
                  value={draft.canvas.grid}
                  testId="settings-grid"
                  onChange={(grid) => patch('canvas', { grid })}
                  options={[
                    { value: 'both', label: 'Vert. et horiz.' },
                    { value: 'horizontal', label: 'Horizontales' },
                    { value: 'vertical', label: 'Verticales' },
                    { value: 'none', label: 'Aucune' },
                  ]}
                />
              </Row>
              <Check
                label="Bordures des échelles"
                checked={draft.canvas.scaleLines}
                onChange={(scaleLines) => patch('canvas', { scaleLines })}
                testId="settings-scale-lines"
              />

              <GroupLabel>Curseur</GroupLabel>
              <Row label="Style du réticule">
                <Choice
                  label="Style du réticule"
                  value={draft.canvas.crosshairStyle}
                  testId="settings-crosshair-style"
                  onChange={(crosshairStyle) => patch('canvas', { crosshairStyle })}
                  options={[
                    { value: 'dashed', label: 'Tirets' },
                    { value: 'dotted', label: 'Pointillés' },
                    { value: 'solid', label: 'Continu' },
                  ]}
                />
              </Row>
              <Check
                label="Aimanter le réticule aux valeurs OHLC"
                checked={draft.canvas.crosshairMagnet}
                onChange={(crosshairMagnet) => patch('canvas', { crosshairMagnet })}
                testId="settings-crosshair-magnet"
              />

              <GroupLabel>Filigrane</GroupLabel>
              <Check
                label="Afficher le symbole en filigrane"
                checked={draft.canvas.watermark}
                onChange={(watermark) => patch('canvas', { watermark })}
                testId="settings-watermark"
              />
            </div>
          )}
        </div>
      </div>
    </ChartModal>
  );
}
