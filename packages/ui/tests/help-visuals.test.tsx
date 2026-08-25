import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AnnotatedProductScreenshot, HelpVisual } from '../src/help-visuals';
import {
  HELP_DYNAMIC_VISUAL_IDS,
  type HelpDynamicVisualId,
  type HelpVisualModel,
  type ProductScreenshotModel,
} from '../src/help-visuals/types';

afterEach(cleanup);

const FACTS = {
  profitTargetRate: 'CIBLE_POLICY',
  dailyLossRate: 'QUOTIDIEN_POLICY',
  maximumLossRate: 'MAXIMUM_POLICY',
  bestDayMaxRatio: 'MEILLEURE_JOURNEE_POLICY',
  minimumTradingDays: 'JOURS_MIN_POLICY',
  shortDurationSeconds: 'DUREE_POLICY',
  permanentBufferRate: 'BUFFER_POLICY',
  performanceDayThresholdRate: 'SEUIL_JOURNEE_POLICY',
  performanceDaysRequired: 'JOURNEES_POLICY',
  traderSplitDefault: 'PART_STANDARD_POLICY',
  traderSplitFinalCycle: 'PART_FINALE_POLICY',
  maxPayoutCyclesBeforeReview: 'CYCLES_POLICY',
  evaluationPolicyVersion: 'EVALUATION_POLICY',
  performancePolicyVersion: 'PERFORMANCE_POLICY',
} as const;

function model(id: HelpDynamicVisualId): HelpVisualModel {
  return {
    id,
    title: `Titre ${id}`,
    summary: `Résumé ${id}`,
    textEquivalent: `Description structurée ${id}`,
    facts: FACTS,
    performanceDaysRequired: 5,
    maxPayoutCyclesBeforeReview: 5,
  };
}

describe('HelpVisual', () => {
  it.each(HELP_DYNAMIC_VISUAL_IDS)('rend %s avec un titre et une description textuelle', (id) => {
    const { container } = render(<HelpVisual model={model(id)} />);

    expect(screen.getByRole('heading', { name: `Titre ${id}` })).toBeInTheDocument();
    expect(screen.getByText(`Description structurée ${id}`)).toBeInTheDocument();
    expect(container.querySelector(`[data-help-visual="${id}"]`)).toBeInTheDocument();
  });

  it('affiche les valeurs injectées par la policy dans les visuels financiers', () => {
    const checks: ReadonlyArray<[HelpDynamicVisualId, string]> = [
      ['HLP-VIS-001', 'QUOTIDIEN_POLICY'],
      ['HLP-VIS-002', 'MAXIMUM_POLICY'],
      ['HLP-VIS-004', 'MEILLEURE_JOURNEE_POLICY'],
      ['HLP-VIS-005', 'DUREE_POLICY'],
      ['HLP-VIS-009', 'BUFFER_POLICY'],
      ['HLP-VIS-010', 'SEUIL_JOURNEE_POLICY'],
      ['HLP-VIS-012', 'PART_STANDARD_POLICY'],
      ['HLP-VIS-013', 'PART_FINALE_POLICY'],
      ['HLP-VIS-019', 'EVALUATION_POLICY'],
    ];

    for (const [id, expected] of checks) {
      const { unmount } = render(<HelpVisual model={model(id)} />);
      expect(screen.getAllByText(new RegExp(expected)).length).toBeGreaterThan(0);
      unmount();
    }
  });

  it('construit les répétitions depuis les nombres DTO, sans valeur de programme locale', () => {
    const performance = model('HLP-VIS-010');
    performance.performanceDaysRequired = 3;
    const first = render(<HelpVisual model={performance} />);
    expect(screen.getByLabelText('3 nouvelles journées requises par payout')).toBeInTheDocument();
    expect(screen.getAllByText('Comptée')).toHaveLength(3);
    first.unmount();

    const cycles = model('HLP-VIS-013');
    cycles.maxPayoutCyclesBeforeReview = 4;
    render(<HelpVisual model={cycles} />);
    expect(screen.getByText('Payout 4')).toBeInTheDocument();
    expect(screen.queryByText('Payout 5')).not.toBeInTheDocument();
  });

  it('échoue fermé quand un nombre brut de policy manque', () => {
    const performance = model('HLP-VIS-010');
    performance.performanceDaysRequired = null;
    const first = render(<HelpVisual model={performance} />);
    expect(screen.getByText('Nombre de journées non publié')).toBeInTheDocument();
    expect(screen.queryByLabelText(/nouvelles journées requises/)).not.toBeInTheDocument();
    first.unmount();

    const cycles = model('HLP-VIS-013');
    cycles.maxPayoutCyclesBeforeReview = null;
    render(<HelpVisual model={cycles} />);
    expect(screen.getByText('Nombre de cycles non publié')).toBeInTheDocument();
    expect(screen.queryByText(/Payout 1/)).not.toBeInTheDocument();
  });

  it('nomme les conséquences critiques avant les métaphores', () => {
    const daily = render(<HelpVisual model={model('HLP-VIS-001')} />);
    expect(screen.getByText(/TEMPORAIRE · protège la journée/)).toBeInTheDocument();
    expect(screen.getByText(/DÉFINITIF · protège toute la vie du compte/)).toBeInTheDocument();
    expect(screen.getByText(/✓ Le compte continue/)).toBeInTheDocument();
    expect(screen.getByText(/✕ Le compte ne continue pas/)).toBeInTheDocument();
    const dailyIllustration = daily.container.querySelector('[data-help-illustration]');
    const dailyPanels = daily.container.querySelector('.grid');
    expect(dailyPanels?.compareDocumentPosition(dailyIllustration as Node) ?? 0).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    daily.unmount();

    const trailing = render(<HelpVisual model={model('HLP-VIS-002')} />);
    expect(screen.getByText('La journée se termine')).toBeInTheDocument();
    expect(screen.getByText('Le plancher remonte')).toBeInTheDocument();
    expect(screen.getByText('Il ne redescend plus')).toBeInTheDocument();
    expect(trailing.container).not.toHaveTextContent(/\bEOD\b/);
    trailing.unmount();

    render(<HelpVisual model={model('HLP-VIS-009')} />);
    expect(screen.getByText('EXCÉDENT DISPONIBLE')).toBeInTheDocument();
    expect(screen.getByText(/VERROUILLÉ — reste dans le compte/)).toBeInTheDocument();
    expect(screen.getByText('Demande de payout')).toBeInTheDocument();
  });

  it('utilise un français public sans jargon interne dans les fallbacks', () => {
    const performance = model('HLP-VIS-010');
    performance.performanceDaysRequired = null;
    const first = render(<HelpVisual model={performance} />);
    expect(first.container).not.toHaveTextContent(/\bpolicy\b/i);
    first.unmount();

    const cycles = model('HLP-VIS-013');
    cycles.maxPayoutCyclesBeforeReview = null;
    const second = render(<HelpVisual model={cycles} />);
    expect(second.container).not.toHaveTextContent(/\bpolicy\b/i);
  });
});

describe('AnnotatedProductScreenshot', () => {
  const screenshot: ProductScreenshotModel = {
    id: 'HLP-SCR-003',
    title: 'Clôture partielle',
    summary: 'Flux produit réel',
    src: '/desktop.webp',
    mobileSrc: '/mobile.webp',
    alt: 'Position de fixture dans le formulaire de clôture partielle.',
    callouts: [
      { id: 1, label: 'Position concernée', x: 25, y: 30 },
      { id: 2, label: 'Quantité restante', x: 70, y: 80 },
    ],
  };

  it('fournit une image responsive et une légende lisible hors de la capture', () => {
    const { container } = render(<AnnotatedProductScreenshot model={screenshot} />);

    expect(screen.getByAltText(screenshot.alt)).toHaveAttribute('src', '/desktop.webp');
    expect(container.querySelector('source[media="(max-width: 639px)"]')).toHaveAttribute(
      'srcset',
      '/mobile.webp',
    );
    expect(screen.getByRole('list', { name: 'Repères de la capture' })).toBeInTheDocument();
    expect(screen.getAllByText('Position concernée')).toHaveLength(2);
    expect(screen.getByText(/Repères : 1\. Position concernée/)).toBeInTheDocument();
  });
});
