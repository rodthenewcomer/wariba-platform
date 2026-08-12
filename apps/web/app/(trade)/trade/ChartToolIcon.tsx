import {
  WariXFibonacciToolIcon,
  WariXHorizontalLineToolIcon,
  WariXRayToolIcon,
  WariXRectangleToolIcon,
  WariXSelectToolIcon,
  WariXTrendLineToolIcon,
  type WorkstationIconSize,
} from '@wariba/ui';
import type { ChartTool } from './chart-tool-mode';

export interface ChartToolIconProps {
  tool: ChartTool;
  size?: WorkstationIconSize;
}

/** The six W5 drawing semantics expressed through one WARIBA-owned icon grammar. */
export function ChartToolIcon({ tool, size = 'rail' }: ChartToolIconProps) {
  switch (tool) {
    case 'select':
      return <WariXSelectToolIcon size={size} />;
    case 'horizontal_line':
      return <WariXHorizontalLineToolIcon size={size} />;
    case 'trend_line':
      return <WariXTrendLineToolIcon size={size} />;
    case 'ray':
      return <WariXRayToolIcon size={size} />;
    case 'rectangle':
      return <WariXRectangleToolIcon size={size} />;
    case 'fibonacci':
      return <WariXFibonacciToolIcon size={size} />;
  }
}
