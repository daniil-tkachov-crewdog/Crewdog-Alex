import Link from "next/link";
import { ShieldCheck, LogOut, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/login/actions";

/**
 * Admin-panel header. Deliberately distinct from the tenant AppHeader — this is
 * an internal, isolated surface. Shows who's signed in and an escape hatch back
 * to the normal app.
 */
export function AdminHeader({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <Logo href="/admin" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="size-3.5" />
            Admin
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">
              <ArrowLeft className="size-4" />
              Back to app
            </Link>
          </Button>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {email}
          </span>
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="size-4" />
              Log out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
