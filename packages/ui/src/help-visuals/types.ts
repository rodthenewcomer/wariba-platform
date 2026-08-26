export const HELP_DYNAMIC_VISUAL_IDS = [
  'HLP-VIS-001',
  'HLP-VIS-002',
  'HLP-VIS-003',
  'HLP-VIS-004',
  'HLP-VIS-005',
  'HLP-VIS-006',
  'HLP-VIS-008',
  'HLP-VIS-009',
  'HLP-VIS-010',
  'HLP-VIS-011',
  'HLP-VIS-012',
  'HLP-VIS-013',
  'HLP-VIS-014',
  'HLP-VIS-015',
  'HLP-VIS-016',
  'HLP-VIS-017',
  'HLP-VIS-018',
  'HLP-VIS-019',
] as const;

export const HELP_SCREENSHOT_VISUAL_IDS = [
  'HLP-SCR-001',
  'HLP-SCR-002',
  'HLP-SCR-003',
  'HLP-SCR-004',
  'HLP-SCR-005',
  'HLP-SCR-006',
  'HLP-SCR-007',
] as const;

export const HELP_P0_VISUAL_IDS = [
  ...HELP_DYNAMIC_VISUAL_IDS,
  ...HELP_SCREENSHOT_VISUAL_IDS,
] as const;

export type HelpDynamicVisualId = (typeof HELP_DYNAMIC_VISUAL_IDS)[number];
export type HelpScreenshotVisualId = (typeof HELP_SCREENSHOT_VISUAL_IDS)[number];
export type HelpP0VisualId = (typeof HELP_P0_VISUAL_IDS)[number];

export type HelpVisualFactKey =
  | 'profitTargetRate'
  | 'dailyLossRate'
  | 'maximumLossRate'
  | 'bestDayMaxRatio'
  | 'minimumTradingDays'
  | 'shortDurationSeconds'
  | 'permanentBufferRate'
  | 'performanceDayThresholdRate'
  | 'performanceDaysRequired'
  | 'traderSplitDefault'
  | 'traderSplitFinalCycle'
  | 'maxPayoutCyclesBeforeReview'
  | 'evaluationPolicyVersion'
  | 'performancePolicyVersion';

export type HelpVisualFacts = Readonly<Partial<Record<HelpVisualFactKey, string>>>;

export interface HelpVisualModel {
  id: HelpDynamicVisualId;
  title: string;
  summary: string;
  textEquivalent: string;
  facts: HelpVisualFacts;
  performanceDaysRequired: number | null;
  maxPayoutCyclesBeforeReview: number | null;
}

export interface ScreenshotCallout {
  id: number;
  label: string;
  /** Percentage of the image width. */
  x: number;
  /** Percentage of the image height. */
  y: number;
  /** Optional mobile coordinates when the compact capture keeps overlays. */
  mobileX?: number;
  mobileY?: number;
}

export interface ProductScreenshotModel {
  id: HelpScreenshotVisualId;
  title: string;
  summary: string;
  src: string;
  mobileSrc?: string;
  alt: string;
  callouts: readonly ScreenshotCallout[];
}
