'use client';

import { memo } from 'react';
import { ToolRailButton } from '@wariba/ui';
import { ChartToolIcon } from './ChartToolIcon';
import { CHART_TOOLS, toolLabel, type ChartTool } from './chart-tool-mode';

export interface DrawingToolRailProps {
  tool: ChartTool;
  onSelect(tool: ChartTool): void;
}

/** WX1 desktop rail: exactly the six persisted W5 tools, with no implied catalogue. */
export const DrawingToolRail = memo(function DrawingToolRail({
  tool,
  onSelect,
}: DrawingToolRailProps) {
  return (
    <div
      role="group"
      aria-label="Outils de dessin"
      data-testid="chart-tools-trigger"
      className="flex h-full w-[var(--wariba-component-workstation-drawing-rail-width)] shrink-0 flex-col items-center gap-0.5 border-r border-[color:var(--wariba-component-workstation-border-hairline)] bg-[color:var(--wariba-component-workstation-surface-raised-module)] py-1"
    >
      {CHART_TOOLS.map((option) => (
        <ToolRailButton
          key={option}
          label={toolLabel(option)}
          icon={<ChartToolIcon tool={option} />}
          active={option === tool}
          data-testid={`chart-tool-${option}`}
          onClick={() => onSelect(option)}
        />
      ))}
    </div>
  );
});
