import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const links = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
  { href: "/contact", label: "Contact Us" },
  { href: "/faq", label: "FAQ" },
];

/** Public marketing footer with the required legal + info links. */
export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <Logo />
          <p className="text-sm text-muted-foreground">
            AI chat for job boards.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t">
        <div className="mx-auto max-w-6xl px-5 py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Crewdog Alex. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
