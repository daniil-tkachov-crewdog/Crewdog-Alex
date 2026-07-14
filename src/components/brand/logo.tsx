import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * "Crewdog Alex" text wordmark. "Alex" renders in neo-purple metal
 * (see .alex-metal in globals.css). No image asset yet — text for now.
 */
export function Logo({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link href={href} className="inline-flex items-center">
      <span
        className={cn(
          "font-semibold tracking-tight text-lg text-foreground",
          className
        )}
      >
        Crewdog <span className="alex-metal">Alex</span>
      </span>
    </Link>
  );
}
