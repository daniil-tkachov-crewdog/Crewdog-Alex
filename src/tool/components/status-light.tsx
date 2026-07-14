import { cn } from "@/lib/utils";

export type StatusTone = "green" | "amber" | "red";

const toneStyles: Record<StatusTone, { dot: string; text: string; bg: string }> =
  {
    green: {
      dot: "bg-status-green",
      text: "text-status-green",
      bg: "bg-status-green/10",
    },
    amber: {
      dot: "bg-status-amber",
      text: "text-status-amber",
      bg: "bg-status-amber/10",
    },
    red: {
      dot: "bg-status-red",
      text: "text-status-red",
      bg: "bg-status-red/10",
    },
  };

/** A colored status pill with a glowing dot. */
export function StatusLight({
  tone,
  label,
  className,
}: {
  tone: StatusTone;
  label: string;
  className?: string;
}) {
  const s = toneStyles[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium",
        s.bg,
        s.text,
        className
      )}
    >
      <span className={cn("size-2 rounded-full", s.dot)} />
      {label}
    </span>
  );
}
