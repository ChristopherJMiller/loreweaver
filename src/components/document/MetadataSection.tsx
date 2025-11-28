import { useState } from "react";
import { ChevronDown, ChevronRight, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetadataSectionProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function MetadataSection({
  children,
  defaultOpen = false,
  className,
}: MetadataSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("metadata-section border-b border-border pb-4 mb-6", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 py-2 hover:text-foreground transition-colors text-muted-foreground"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <Settings2 className="h-4 w-4" />
        <span className="text-sm font-medium">Details</span>
      </button>

      {isOpen && (
        <div className="mt-4 pl-6">
          {children}
        </div>
      )}
    </div>
  );
}
