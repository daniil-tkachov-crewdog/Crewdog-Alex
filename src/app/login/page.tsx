"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Login / Sign Up page — DESIGN ONLY, not wired to auth yet.
 * Per the current flow, submitting simply passes through to the dashboard.
 * A real auth page slots in here later without changing anything around it.
 */
type Mode = "login" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const router = useRouter();

  function passthrough(e: React.FormEvent) {
    e.preventDefault();
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/30 px-5 py-12">
      <div className="mb-8">
        <Logo />
      </div>

      <div className="w-full max-w-sm rounded-2xl border bg-card p-7 shadow-sm">
        {/* Switcher */}
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          <Switch active={mode === "login"} onClick={() => setMode("login")}>
            Login
          </Switch>
          <Switch active={mode === "signup"} onClick={() => setMode("signup")}>
            Sign Up
          </Switch>
        </div>

        {mode === "login" ? (
          <form onSubmit={passthrough} className="flex flex-col gap-4">
            <Field label="Login">
              <Input type="text" placeholder="you@company.com" autoComplete="username" />
            </Field>
            <Field label="Password">
              <Input type="password" placeholder="••••••••" autoComplete="current-password" />
            </Field>
            <Button type="submit" className="mt-2 w-full">
              Login
            </Button>
          </form>
        ) : (
          <form onSubmit={passthrough} className="flex flex-col gap-4">
            <Field label="Company name">
              <Input type="text" placeholder="Acme Jobs" />
            </Field>
            <Field label="Email">
              <Input type="email" placeholder="you@company.com" autoComplete="email" />
            </Field>
            <Field label="Password">
              <Input type="password" placeholder="••••••••" autoComplete="new-password" />
            </Field>
            <Field label="Confirm Password">
              <Input type="password" placeholder="••••••••" autoComplete="new-password" />
            </Field>
            <Button type="submit" className="mt-2 w-full">
              Sign Up
            </Button>
          </form>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Auth isn&apos;t wired up yet — this takes you straight to the dashboard.
      </p>
    </div>
  );
}

function Switch({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-md text-sm font-medium transition-all cursor-pointer",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
