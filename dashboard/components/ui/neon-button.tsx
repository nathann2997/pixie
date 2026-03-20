import * as React from "react";
import { cn } from "@/lib/utils";

/** Pigxel primary action button — Coral Block. Solid, matte, no glow. */
export interface NeonButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const NeonButton = React.forwardRef<HTMLButtonElement, NeonButtonProps>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 h-9 text-sm font-medium text-white",
        "bg-rose-400 hover:bg-rose-500",
        "shadow-sm transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
NeonButton.displayName = "NeonButton";

export { NeonButton };
