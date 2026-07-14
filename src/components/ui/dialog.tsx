"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Minimal modal dialog (no external primitive). Renders a fixed overlay when
 * `open`; clicking the backdrop or the ✕ calls `onClose`. Used for CSV import
 * errors and the delete confirmation.
 */
function Dialog({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        className={cn(
          "bg-card text-card-foreground relative z-10 w-full max-w-md rounded-xl border p-6 shadow-lg",
          className
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-muted-foreground hover:text-foreground absolute right-4 top-4 transition-colors"
        >
          <X className="size-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn("text-lg font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-muted-foreground mt-1.5 text-sm", className)}
      {...props}
    />
  );
}

export { Dialog, DialogTitle, DialogDescription };
