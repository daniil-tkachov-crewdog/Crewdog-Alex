import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

/** Public marketing header: logo left, Login button right. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <Button asChild size="sm">
          <Link href="/login">Login</Link>
        </Button>
      </div>
    </header>
  );
}
