'use client';

import type { ComponentType } from 'react';
import {
  Activity,
  Bell,
  BellRing,
  CalendarDays,
  ChartArea,
  ChartCandlestick,
  ChartLine,
  ChartNoAxesColumnIncreasing,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Ellipsis,
  Gauge,
  HandCoins,
  LifeBuoy,
  List,
  ListRestart,
  Maximize2,
  Minus,
  MousePointer2,
  MoveRight,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  RectangleHorizontal,
  RotateCcw,
  Search,
  ScanLine,
  ShieldAlert,
  SlidersHorizontal,
  Star,
  Trash2,
  TrendingUp,
  WalletCards,
  X,
  type LucideProps,
} from 'lucide-react';
import { cx } from '../lib/cx';

export type WorkstationIconSize = 'toolbar' | 'rail' | 'nav' | 'tab' | 'mobile';

export interface WorkstationIconProps {
  size?: WorkstationIconSize;
  label?: string;
  className?: string;
  filled?: boolean;
}

const PIXELS: Record<WorkstationIconSize, number> = {
  toolbar: 18,
  rail: 28,
  nav: 28,
  /*
   * Phone bottom navigation.
   *
   * `mobile` at 30px was sized for a workstation drawer, where a glyph is the
   * only thing in its row. In a five-item tab bar the glyph shares 70px of
   * height with a label, and 30px crowds it until the label has to shrink
   * below legibility to fit. 25px keeps both readable — and keeps the row's
   * optical weight closer to the 24-26px every phone platform converged on.
   */
  tab: 25,
  mobile: 30,
};

function createWorkstationIcon(Glyph: ComponentType<LucideProps>) {
  return function WorkstationIcon({
    size = 'toolbar',
    label,
    className,
    filled = false,
  }: WorkstationIconProps) {
    return (
      <Glyph
        aria-hidden={label ? undefined : true}
        aria-label={label}
        className={cx('shrink-0', className)}
        role={label ? 'img' : 'presentation'}
        size={PIXELS[size]}
        strokeWidth={2}
        fill={filled ? 'currentColor' : 'none'}
      />
    );
  };
}

// Public WARIBA names keep the source library behind @wariba/ui. Product
// components never import lucide-react directly, so icon semantics and stroke
// grammar remain centrally reviewable.
export const WariXTradeIcon = createWorkstationIcon(ChartCandlestick);
export const WariXHubIcon = createWorkstationIcon(Gauge);
export const WariXAccountsIcon = createWorkstationIcon(WalletCards);
export const WariXPayoutsIcon = createWorkstationIcon(HandCoins);
export const WariXMoreIcon = createWorkstationIcon(Ellipsis);
export const WariXNotificationsIcon = createWorkstationIcon(Bell);
/** The right utility rail's canonical watchlist / markets-list glyph. */
export const WariXMarketsIcon = createWorkstationIcon(List);
export const WariXActivityIcon = createWorkstationIcon(Activity);
export const WariXAlertsIcon = createWorkstationIcon(BellRing);
export const WariXCalendarIcon = createWorkstationIcon(CalendarDays);
export const WariXLogIcon = createWorkstationIcon(ListRestart);
export const WariXHelpIcon = createWorkstationIcon(LifeBuoy);
export const WariXCloseRightIcon = createWorkstationIcon(PanelRightClose);
/**
 * Dismissal, in the one glyph every product on earth uses for it.
 *
 * `PanelRightClose` describes *where* a surface goes when it leaves, which is
 * an accurate but second-order fact; a trader scanning a drawer header for the
 * way out looks for a cross. Kept beside it rather than replacing it — the
 * panel glyph still belongs on controls that collapse a track rather than
 * dismiss a surface.
 */
export const WariXCloseIcon = createWorkstationIcon(X);
export const WariXRiskIcon = createWorkstationIcon(ShieldAlert);
/**
 * Search is an action, never a workspace destination.
 *
 * This optically tuned magnifier intentionally lives outside the seven-symbol
 * destination family. The data attribute makes that semantic boundary easy to
 * audit wherever the compact chart header is reused.
 */
export function WariXSearchIcon({ size = 'toolbar', label, className }: WorkstationIconProps) {
  return (
    <Search
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cx('shrink-0', className)}
      data-warix-action="search"
      focusable="false"
      role={label ? 'img' : 'presentation'}
      size={PIXELS[size]}
      strokeWidth={2}
    />
  );
}
export const WariXFavoriteIcon = createWorkstationIcon(Star);
export const WariXIndicatorsIcon = createWorkstationIcon(SlidersHorizontal);
export const WariXFitIcon = createWorkstationIcon(ScanLine);
export const WariXExpandIcon = createWorkstationIcon(Maximize2);
export const WariXResetIcon = createWorkstationIcon(RotateCcw);
export const WariXCollapseLeftIcon = createWorkstationIcon(PanelLeftClose);
export const WariXExpandLeftIcon = createWorkstationIcon(PanelLeftOpen);
export const WariXChevronUpIcon = createWorkstationIcon(ChevronUp);
export const WariXChevronDownIcon = createWorkstationIcon(ChevronDown);
export const WariXChevronRightIcon = createWorkstationIcon(ChevronRight);
export const WariXPaletteIcon = createWorkstationIcon(Palette);
export const WariXDeleteIcon = createWorkstationIcon(Trash2);
export const WariXDoneIcon = createWorkstationIcon(Check);
export const WariXBarsIcon = createWorkstationIcon(ChartNoAxesColumnIncreasing);
export const WariXLineChartIcon = createWorkstationIcon(ChartLine);
export const WariXAreaChartIcon = createWorkstationIcon(ChartArea);

export const WariXSelectToolIcon = createWorkstationIcon(MousePointer2);
export const WariXHorizontalLineToolIcon = createWorkstationIcon(Minus);
export const WariXTrendLineToolIcon = createWorkstationIcon(TrendingUp);
export const WariXRayToolIcon = createWorkstationIcon(MoveRight);
export const WariXRectangleToolIcon = createWorkstationIcon(RectangleHorizontal);
export const WariXFibonacciToolIcon = createWorkstationIcon(ChartNoAxesCombined);
