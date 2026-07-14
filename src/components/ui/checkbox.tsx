"use client";

import * as React from "react";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Lightweight checkbox (no external primitive). Controlled via `checked` +
 * `onCheckedChange`. `indeterminate` renders the "some selected" dash used by
 * the table's select-all header.
 */
function Checkbox({
  checked,
  indeterminate,
  onCheckedChange,
  className,
  disabled,
  "aria-label": ariaLabel,
}: {
  checked?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : !!checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "border-input peer flex size-4 shrink-0 items-center justify-center rounded-[4px] border shadow-sm transition-colors outline-none",
        "focus-visible:ring-ring/40 focus-visible:ring-[3px]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        (checked || indeterminate) &&
          "border-primary bg-primary text-primary-foreground",
        className
      )}
    >
      {indeterminate ? (
        <Minus className="size-3" strokeWidth={3} />
      ) : checked ? (
        <Check className="size-3" strokeWidth={3} />
      ) : null}
    </button>
  );
}

export { Checkbox };
