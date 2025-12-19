import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const expandableButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface ExpandableButtonProps
  extends VariantProps<typeof expandableButtonVariants> {
  /** Icon to display (always visible) */
  icon: React.ReactNode;
  /** Label to show when expanded */
  label: string;
  /** Force expanded state (for touch devices or when dialog is open) */
  forceExpanded?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Button type */
  type?: "button" | "submit" | "reset";
}

/**
 * Hook to detect if the device supports hover
 */
function useSupportsHover() {
  const [supportsHover, setSupportsHover] = React.useState(true);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover)");
    setSupportsHover(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setSupportsHover(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return supportsHover;
}

const ExpandableButton = React.forwardRef<
  HTMLButtonElement,
  ExpandableButtonProps
>(
  (
    { icon, label, variant = "default", className, forceExpanded, disabled, onClick, type = "button" },
    ref
  ) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);
    const supportsHover = useSupportsHover();

    // Expand if hovered, focused, force expanded, or on touch devices
    const isExpanded =
      forceExpanded || !supportsHover || (isHovered && !disabled) || isFocused;

    return (
      <motion.button
        ref={ref}
        type={type}
        layout
        className={cn(
          expandableButtonVariants({ variant }),
          "h-9 overflow-hidden",
          isExpanded ? "px-3" : "w-9",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        onClick={onClick}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        <motion.span layout="position" className="shrink-0">
          {icon}
        </motion.span>
        <AnimatePresence mode="wait">
          {isExpanded && (
            <motion.span
              key="label"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden whitespace-nowrap ms-2"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }
);
ExpandableButton.displayName = "ExpandableButton";

export interface ExpandableButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  /** Gap between buttons */
  gap?: 1 | 2 | 3;
}

function ExpandableButtonGroup({
  children,
  className,
  gap = 2,
}: ExpandableButtonGroupProps) {
  const gapClass = {
    1: "gap-1",
    2: "gap-2",
    3: "gap-3",
  }[gap];

  return (
    <div className={cn("flex items-center", gapClass, className)}>
      {children}
    </div>
  );
}

export { ExpandableButton, ExpandableButtonGroup, expandableButtonVariants };
