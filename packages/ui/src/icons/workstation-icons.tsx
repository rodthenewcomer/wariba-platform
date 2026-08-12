'use client';

import type { ComponentType } from 'react';
import {
  Bell,
  ChartCandlestick,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronUp,
  Ellipsis,
  Gauge,
  HandCoins,
  Maximize2,
  Minus,
  MousePointer2,
  MoveRight,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  RectangleHorizontal,
  RotateCcw,
  ScanLine,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Star,
  Trash2,
  TrendingUp,
  WalletCards,
  type LucideProps,
} from 'lucide-react';
import { cx } from '../lib/cx';

export type WorkstationIconSize = 'toolbar' | 'rail' | 'nav' | 'mobile';

export interface WorkstationIconProps {
  size?: WorkstationIconSize;
  label?: string;
  className?: string;
  filled?: boolean;
}

const PIXELS: Record<WorkstationIconSize, number> = {
  toolbar: 16,
  rail: 18,
  nav: 20,
  mobile: 22,
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
        strokeWidth={1.75}
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
export const WariXRiskIcon = createWorkstationIcon(ShieldAlert);
export const WariXSearchIcon = createWorkstationIcon(Search);
export const WariXFavoriteIcon = createWorkstationIcon(Star);
export const WariXIndicatorsIcon = createWorkstationIcon(SlidersHorizontal);
export const WariXFitIcon = createWorkstationIcon(ScanLine);
export const WariXExpandIcon = createWorkstationIcon(Maximize2);
export const WariXResetIcon = createWorkstationIcon(RotateCcw);
export const WariXCollapseLeftIcon = createWorkstationIcon(PanelLeftClose);
export const WariXExpandLeftIcon = createWorkstationIcon(PanelLeftOpen);
export const WariXChevronUpIcon = createWorkstationIcon(ChevronUp);
export const WariXChevronDownIcon = createWorkstationIcon(ChevronDown);
export const WariXPaletteIcon = createWorkstationIcon(Palette);
export const WariXDeleteIcon = createWorkstationIcon(Trash2);
export const WariXDoneIcon = createWorkstationIcon(Check);

export const WariXSelectToolIcon = createWorkstationIcon(MousePointer2);
export const WariXHorizontalLineToolIcon = createWorkstationIcon(Minus);
export const WariXTrendLineToolIcon = createWorkstationIcon(TrendingUp);
export const WariXRayToolIcon = createWorkstationIcon(MoveRight);
export const WariXRectangleToolIcon = createWorkstationIcon(RectangleHorizontal);
export const WariXFibonacciToolIcon = createWorkstationIcon(ChartNoAxesCombined);
