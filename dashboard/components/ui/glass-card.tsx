import * as React from "react";
import { cn } from "@/lib/utils";

/** The "Data Brick" — Pigxel's primary card surface. Clean, bordered, white. */
const GlassCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl bg-white border border-slate-200 shadow-sm",
      className
    )}
    {...props}
  />
));
GlassCard.displayName = "GlassCard";

export { GlassCard };
