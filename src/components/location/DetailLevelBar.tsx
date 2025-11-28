import { cn } from "@/lib/utils";
import {
  getDetailLevelBgColor,
  getDetailLevelLabel,
  getDetailLevelBreakdown,
} from "@/lib/detailLevel";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Location, Relationship } from "@/types";

interface DetailLevelBarProps {
  location: Location;
  relationships?: Relationship[];
  childCount?: number;
  sessionMentions?: number;
  showLabel?: boolean;
  showTooltip?: boolean;
  className?: string;
}

export function DetailLevelBar({
  location,
  relationships = [],
  childCount = 0,
  sessionMentions = 0,
  showLabel = false,
  showTooltip = true,
  className,
}: DetailLevelBarProps) {
  const breakdown = getDetailLevelBreakdown({
    location,
    relationships,
    childCount,
    sessionMentions,
  });

  const bar = (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-2 flex-1 rounded-full bg-secondary">
        <div
          className={cn(
            "h-2 rounded-full transition-all",
            getDetailLevelBgColor(breakdown.total)
          )}
          style={{ width: `${breakdown.total}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {breakdown.total}% - {getDetailLevelLabel(breakdown.total)}
        </span>
      )}
      {!showLabel && (
        <span className="text-xs text-muted-foreground">{breakdown.total}%</span>
      )}
    </div>
  );

  if (!showTooltip) {
    return bar;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{bar}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-1 text-xs">
          <p className="font-medium">Detail Level Breakdown</p>
          <ul className="space-y-0.5 text-muted-foreground">
            {breakdown.descriptionShort > 0 && (
              <li>+{breakdown.descriptionShort} Description (&gt;100 chars)</li>
            )}
            {breakdown.descriptionLong > 0 && (
              <li>
                +{breakdown.descriptionLong} Long description (&gt;500 chars)
              </li>
            )}
            {breakdown.gmNotes > 0 && (
              <li>+{breakdown.gmNotes} GM Notes present</li>
            )}
            {breakdown.relationships > 0 && (
              <li>+{breakdown.relationships} Relationships</li>
            )}
            {breakdown.children > 0 && (
              <li>+{breakdown.children} Child locations</li>
            )}
            {breakdown.sessionMentions > 0 && (
              <li>+{breakdown.sessionMentions} Session mentions</li>
            )}
            {breakdown.total === 0 && <li>No content yet</li>}
          </ul>
          <p className="pt-1 font-medium">
            Total: {breakdown.total}% ({getDetailLevelLabel(breakdown.total)})
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
