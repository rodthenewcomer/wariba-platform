/**
 * @wariba/ui — WARIBA UI primitives, components and patterns (Design System implementation).
 *
 * All components here take pre-computed props and contain no business logic
 * (Design System §48) — formulas, risk math, and payout math live in domain
 * packages from later prompts. See WARIBA_Design_System_v1.0.md.
 */

export const PACKAGE_NAME = '@wariba/ui';

export * from './lib/cx';
export type { LinkComponentType } from './lib/link';

// Primitives — Design System §47.1
export * from './primitives/Box';
export * from './primitives/Stack';
export * from './primitives/Grid';
export * from './primitives/Text';
export * from './primitives/Icon';
export * from './primitives/Divider';
export * from './primitives/VisuallyHidden';
export * from './icons/nav-icons';
export * from './icons/shell-icons';
export * from './icons/workstation-icons';
export * from './icons/warix';
export * from './icons/charting';

// Fundamental components — Design System §47.2 / Prompt 02 scope
// button-styles first and explicitly: it's a plain function with no 'use client',
// safe to call from Server Components — re-exporting it *through* Button.tsx
// (which has 'use client') would taint it as a client-only reference.
export { buttonClassNames } from './components/button-styles';
export type { ButtonSize, ButtonStyleOptions, ButtonVariant } from './components/button-styles';
export { Button } from './components/Button';
export type { ButtonProps } from './components/Button';
export * from './components/Input';
export * from './components/Select';
export * from './components/Checkbox';
export * from './components/Radio';
export * from './components/Switch';
export * from './components/Tabs';
export * from './components/Badge';
export * from './components/Alert';
export * from './components/Tooltip';
export * from './components/Dialog';
export * from './components/BottomSheet';
export * from './components/Skeleton';
export * from './components/Card';
export * from './components/DataTable';
export * from './components/EmptyState';
export * from './components/PricingCard';
export * from './components/FeatureCard';
export * from './components/StatTile';
export * from './components/Accordion';
export * from './components/Workstation';

// Public page primitives — Phase 3.4.5A §13
export * from './public';

// Signature objects — Phase 3.4.5R §9
export * from './signature';

// Layouts — Design System §26 / Prompt 02 scope
export * from './layouts/PublicHeader';
export * from './layouts/PublicMobileMenu';
export * from './layouts/FixedUiCoordinator';
export * from './layouts/public-nav';
export * from './layouts/PublicFooter';
export * from './layouts/legal-disclosure';
export * from './layouts/PlatformSidebar';
export * from './layouts/MobileBottomNav';
export * from './layouts/ControlSidebar';

// WARIBA-specific components — Design System §47.4, no business logic inside
export * from './wariba/AccountContext';
export * from './wariba/InstrumentAvatar';
export * from './wariba/WariXFeedback';
export * from './wariba/MissionProgress';
export * from './wariba/RiskRibbon';
export * from './wariba/ConsistencyMeter';
export * from './wariba/QualifiedDaysTracker';
export * from './wariba/PayoutBreakdown';
export * from './wariba/ExecutionState';
export * from './wariba/PolicyVersionChip';
export * from './wariba/EvidencePanel';
export * from './wariba/ReserveCoverage';
export * from './wariba/AccountSelector';
export * from './wariba/ActivityTimeline';
export * from './wariba/TradingDaysList';
export * from './wariba/OpenPositionsTable';
export * from './wariba/Guardian';
export * from './wariba/WariXPositionsTable';

// Help Center visual education — presentation-only models, no policy math.
export * from './help-visuals';
