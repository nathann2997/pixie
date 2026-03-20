"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

const GlassModal = DialogPrimitive.Root;
const GlassModalTrigger = DialogPrimitive.Trigger;
const GlassModalClose = DialogPrimitive.Close;
const GlassModalPortal = DialogPrimitive.Portal;

const GlassModalOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200 data-[state=open]:opacity-100 data-[state=closed]:opacity-0",
      className
    )}
    {...props}
  />
));
GlassModalOverlay.displayName = DialogPrimitive.Overlay.displayName;

const GlassModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <GlassModalPortal>
    <GlassModalOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 p-4",
        "transition-all duration-200 data-[state=closed]:opacity-0 data-[state=open]:opacity-100 data-[state=closed]:scale-95 data-[state=open]:scale-100",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </GlassModalPortal>
));
GlassModalContent.displayName = DialogPrimitive.Content.displayName;

const GlassModalTitle = DialogPrimitive.Title;
const GlassModalDescription = DialogPrimitive.Description;

/** Wraps modal content in a Data Brick card with elevation shadow */
function GlassModalCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <GlassCard
      className={cn("shadow-xl", className)}
      {...props}
    />
  );
}

export {
  GlassModal,
  GlassModalTrigger,
  GlassModalClose,
  GlassModalContent,
  GlassModalTitle,
  GlassModalDescription,
  GlassModalCard,
};
