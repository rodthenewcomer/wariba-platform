'use client';

import { memo } from 'react';
import { ToolRailButton } from '@wariba/ui';
import { ChartToolIcon } from './ChartToolIcon';
import { CHART_TOOLS, toolLabel, type ChartTool } from './chart-tool-mode';

export interface DrawingToolRailProps {
  tool: ChartTool;
  onSelect(tool: ChartTool): void;
}

/**
 * WX1 desktop rail: exactly the six persisted W5 tools, with no implied
 * catalogue.
 *
 * Visual closure §11 — the rail belongs to the chart. It now sits on the chart's
 * own background rather than on the raised module surface, so the tools read as
 * floating over the plot instead of as a separate grey column bolted to its
 * left edge; only a hairline marks the seam. Selection is carried by
 * `ToolRailButton`'s cobalt wash, cobalt glyph and rail-edge rule together —
 * WX1 carried it as a grey fill one step off its neighbour, which measured
 * ~3.04:1 and read as considerably less than that.
 */
export const DrawingToolRail = memo(function DrawingToolRail({
  tool,
  onSelect,
}: DrawingToolRailProps) {
  return (
    <div
      role="group"
      aria-label="Outils de dessin"
      data-testid="chart-tools-trigger"
      className="flex h-full w-[var(--wariba-component-workstation-drawing-rail-width)] shrink-0 flex-col items-center gap-1 border-r border-[color:var(--wariba-component-workstation-border-hairline)] bg-[color:var(--wariba-chart-background)] py-1.5"
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
