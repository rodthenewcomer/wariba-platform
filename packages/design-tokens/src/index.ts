/**
 * @wariba/design-tokens — Design tokens (colors, typography, spacing, motion) - single source for UI and Tailwind theme.
 *
 * Source of truth is docs/05-design/tokens.json. `pnpm --filter @wariba/design-tokens build`
 * regenerates ./tokens.css (CSS custom properties, consumed by Tailwind's @theme in
 * apps/web/app/globals.css) and ./tokens.generated.ts (typed raw values, re-exported below)
 * from that JSON — never hand-edit the generated files directly.
 *
 * See WARIBA_Design_System_v1.0.md and WARIBA_System_Architecture_v1.0.md §10.
 */

export const PACKAGE_NAME = '@wariba/design-tokens';

export {
  color,
  semanticLight,
  semanticDark,
  status,
  space,
  radius,
  breakpoint,
  motionDuration,
  zIndexToken,
  chart,
} from './tokens.generated';
