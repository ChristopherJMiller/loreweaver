import * as React from "react";
import { cn } from "@/lib/utils";

interface ResizeHandleProps {
  /** Which side of the panel the handle is on */
  side: "left" | "right";
  /** Callback when resize starts/stops (for disabling text selection) */
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
  /** Callback with new width during resize */
  onResize: (delta: number) => void;
  /** Additional class names */
  className?: string;
}

export function ResizeHandle({
  side,
  onResizeStart,
  onResizeEnd,
  onResize,
  className,
}: ResizeHandleProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const startXRef = React.useRef(0);

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startXRef.current = e.clientX;
      onResizeStart?.();
    },
    [onResizeStart]
  );

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      startXRef.current = e.clientX;
      // For left side handles, dragging right should shrink the panel
      // For right side handles, dragging right should grow the panel
      onResize(side === "right" ? delta : -delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onResizeEnd?.();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // Prevent text selection while dragging
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging, onResize, onResizeEnd, side]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        "absolute top-0 bottom-0 z-10 w-1 cursor-col-resize transition-colors",
        "hover:bg-primary/50",
        isDragging && "bg-primary",
        side === "left" ? "left-0" : "right-0",
        className
      )}
    />
  );
}
