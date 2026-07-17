import Link from "next/link";
import {
  MessageSquareText,
  SlidersHorizontal,
  Search,
  Link2,
  Palette,
  Upload,
  Code2,
  Rocket,
  Check,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS } from "@/shared/plans";
import { cn } from "@/lib/utils";

/* ── Block 1: Hero ───────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,oklch(0.96_0.03_293),transparent)]"
      />
      <div className="mx-auto max-w-3xl px-5 py-24 text-center sm:py-32">
        <Badge variant="secondary" className="mb-5">
          Meet Alex — AI chat for job boards
        </Badge>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Your candidates find jobs by{" "}
          <span className="alex-metal">chatting</span>, not scrolling.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground">
          Alex is a white-labeled AI assistant that lives on your job board. It
          asks the right questions, searches your listings, and hands candidates
          the roles that actually fit — in seconds.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/login">Get started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="#pricing">See pricing</Link>
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Add it to your site with a single line of code.
        </p>
      </div>
    </section>
  );
}

/* ── Reusable step grid ──────────────────────────────────────────── */
type Step = { icon: React.ElementType; title: string; body: string };

function StepSection({
  eyebrow,
  heading,
  sub,
  steps,
  tone,
}: {
  eyebrow: string;
  heading: string;
  sub: string;
  steps: Step[];
  tone: "candidate" | "dev";
}) {
  return (
    <section className="border-t">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">{eyebrow}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            {heading}
          </h2>
          <p className="mt-3 text-muted-foreground">{sub}</p>
        </div>
        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="relative rounded-xl border bg-card p-6 shadow-sm"
            >
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg",
                  tone === "candidate"
                    ? "bg-accent text-accent-foreground"
                    : "bg-primary/10 text-primary"
                )}
              >
                <s.icon className="size-5" />
              </div>
              <div className="mt-4 text-xs font-medium text-muted-foreground">
                Step {i + 1}
              </div>
              <h3 className="mt-1 font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── Block 4: Call to action ─────────────────────────────────────── */
function CtaBlock() {
  return (
    <section className="border-t">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <div className="relative overflow-hidden rounded-2xl bg-primary px-8 py-14 text-center text-primary-foreground">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-20 bg-[radial-gradient(50%_80%_at_100%_0%,white,transparent)]"
          />
          <h2 className="text-balance text-3xl font-semibold tracking-tight">
            Ready to put Alex on your board?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-balance text-primary-foreground/80">
            Create an account, pick a plan, and paste one line of code. Your
            candidates start chatting today.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link href="/login">
                Log in &amp; get started
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Block 5: Pricing ────────────────────────────────────────────── */
function Pricing() {
  return (
    <section id="pricing" className="border-t scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Pricing</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Simple monthly plans
          </h2>
          <p className="mt-3 text-muted-foreground">
            Placeholder pricing — final numbers coming soon. Cancel anytime.
          </p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col rounded-2xl border bg-card p-7 shadow-sm",
                plan.highlighted && "border-primary ring-1 ring-primary"
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                {plan.highlighted && <Badge>Most popular</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {plan.tagline}
              </p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-4xl font-semibold tracking-tight">
                  {plan.currency}
                  {plan.price}
                </span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
              <ul className="mt-6 flex flex-col gap-3 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-7 pt-2">
                <Button
                  asChild
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  <Link href="/login">Choose {plan.name}</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <>
      <Hero />
      <StepSection
        tone="candidate"
        eyebrow="For job hunters"
        heading="Find the right role in a conversation"
        sub="No endless filters. Candidates just say what they want and Alex does the searching."
        steps={[
          {
            icon: MessageSquareText,
            title: "Open the chat",
            body: "A floating Alex icon sits on your board. One click opens the chat window.",
          },
          {
            icon: SlidersHorizontal,
            title: "Answer a few questions",
            body: "Alex asks about title, location, salary and remote — the details that matter.",
          },
          {
            icon: Search,
            title: "Alex searches",
            body: "Once it has the essentials, Alex searches your live job listings.",
          },
          {
            icon: Link2,
            title: "Get matching jobs",
            body: "Alex replies with direct links to the roles that actually fit.",
          },
        ]}
      />
      <StepSection
        tone="dev"
        eyebrow="For your dev team"
        heading="Live on your site in four steps"
        sub="Set up branding, connect your jobs, drop in the script, and press Start."
        steps={[
          {
            icon: Palette,
            title: "Brand it",
            body: "Name your assistant, set your board name and upload your logo.",
          },
          {
            icon: Upload,
            title: "Connect your jobs",
            body: "Upload a CSV now — feed-URL sync and scraping are on the way.",
          },
          {
            icon: Code2,
            title: "Copy the script",
            body: "Grab your unique one-line embed script from the dashboard.",
          },
          {
            icon: Rocket,
            title: "Press Start",
            body: "Flip the switch and Alex goes live for your candidates.",
          },
        ]}
      />
      <CtaBlock />
      <Pricing />
    </>
  );
}
