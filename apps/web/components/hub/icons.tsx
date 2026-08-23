'use client';

import {
  CaretRight,
  ChartLineUp,
  CheckCircle,
  Clock,
  CreditCard,
  DotsThree,
  GearSix,
  HandCoins,
  IdentificationCard,
  Lifebuoy,
  Monitor,
  Notebook,
  PlusCircle,
  ShieldCheck,
  SignOut,
  SquaresFour,
  Target,
  Trophy,
  UserCircle,
  Wallet,
  Warning,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react';
import type { ComponentType } from 'react';

/**
 * The Trader Hub's icon family.
 *
 * ## Why a second library, deliberately
 *
 * WariX runs on Lucide, locked in VX1-F.1, and it should keep running on
 * Lucide: the workstation's language is thin, dense and technical, which is
 * what that family draws well. The Hub is the opposite surface — spacious,
 * navigational, read at a glance — and Lucide's uniform 2px stroke at 26px
 * reads as a thin outline no matter how large the box around it is. That is
 * the failure §22 keeps describing: a 26px icon that still looks 16px.
 *
 * Phosphor has weights. `bold` gives a Hub destination a silhouette that
 * survives a laptop screen at arm's length, and `fill` makes the selected
 * state unmistakable without relying on a background colour a colour-blind
 * trader may not distinguish. One family per product shell — two total, not
 * three, and never two inside one navigation bar.
 *
 * ## The rule this file enforces
 *
 * Pages never import from `@phosphor-icons/react`. They ask for a role —
 * `HubIcon.dashboard` — so the glyph for a concept is decided once, and
 * changing it is one edit rather than a search.
 */

export type HubIconRole =
  | 'dashboard'
  | 'accounts'
  | 'addAccount'
  | 'performance'
  | 'journal'
  | 'payouts'
  | 'billing'
  | 'rewards'
  | 'support'
  | 'settings'
  | 'warix'
  | 'more'
  | 'identity'
  | 'profile'
  | 'signOut'
  | 'chevron'
  | 'target'
  | 'shield'
  | 'success'
  | 'warning'
  | 'pending';

const GLYPH: Record<HubIconRole, PhosphorIcon> = {
  // Navigation. Each silhouette is deliberately unlike its neighbours: a grid,
  // a wallet, a rising line, a notebook, coins in a hand, a card.
  dashboard: SquaresFour,
  accounts: Wallet,
  addAccount: PlusCircle,
  performance: ChartLineUp,
  journal: Notebook,
  payouts: HandCoins,
  billing: CreditCard,
  rewards: Trophy,
  support: Lifebuoy,
  settings: GearSix,
  /** The workstation is a screen you open, not a chart you read. */
  warix: Monitor,
  more: DotsThree,

  // Status and identity.
  identity: IdentificationCard,
  profile: UserCircle,
  signOut: SignOut,
  chevron: CaretRight,
  target: Target,
  shield: ShieldCheck,
  success: CheckCircle,
  warning: Warning,
  pending: Clock,
};

export interface HubIconProps {
  role: HubIconRole;
  /**
   * Optical size. 26px is the Hub default — §22's acceptance range is 24-27,
   * and below that a navigation glyph stops being identifiable in the second
   * a trader gives it.
   */
  size?: number | undefined;
  /** Selected destinations fill; everything else stays a bold outline. */
  active?: boolean | undefined;
  className?: string | undefined;
  /** Supplies an accessible name. Omitted, the glyph is decorative. */
  label?: string | undefined;
}

export function HubIcon({ role, size = 26, active = false, className, label }: HubIconProps) {
  const Glyph = GLYPH[role];
  return (
    <Glyph
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={className}
      role={label ? 'img' : 'presentation'}
      size={size}
      weight={active ? 'fill' : 'bold'}
    />
  );
}

/** For the rare caller that needs the component itself rather than an element. */
export function hubGlyph(role: HubIconRole): ComponentType<{ size?: number; weight?: string }> {
  return GLYPH[role] as unknown as ComponentType<{ size?: number; weight?: string }>;
}
