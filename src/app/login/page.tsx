"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  login,
  signup,
  loginWithGoogle,
  type AuthState,
} from "./actions";

type Mode = "login" | "signup";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/30 px-5 py-12">
      <div className="mb-8">
        <Logo />
      </div>
      <Suspense fallback={null}>
        <AuthCard />
      </Suspense>
    </div>
  );
}

const QUERY_ERRORS: Record<string, string> = {
  google: "Google sign-in failed. Please try again.",
  auth: "That link didn't work. Please log in.",
};

function AuthCard() {
  const [mode, setMode] = useState<Mode>("login");
  const queryError = QUERY_ERRORS[useSearchParams().get("error") ?? ""];
  const [loginState, loginAction, loginPending] = useActionState<AuthState, FormData>(
    login,
    undefined
  );
  const [signupState, signupAction, signupPending] = useActionState<AuthState, FormData>(
    signup,
    undefined
  );

  const state = mode === "login" ? loginState : signupState;

  return (
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
        <form action={loginAction} className="flex flex-col gap-4">
          <Field label="Email">
            <Input
              name="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              required
            />
          </Field>
          <Field label="Password">
            <Input
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </Field>
          <Button type="submit" className="mt-2 w-full" disabled={loginPending}>
            {loginPending ? "Logging in…" : "Login"}
          </Button>
        </form>
      ) : (
        <form action={signupAction} className="flex flex-col gap-4">
          <Field label="Company name">
            <Input name="company" type="text" placeholder="Acme Jobs" required />
          </Field>
          <Field label="Email">
            <Input
              name="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              required
            />
          </Field>
          <Field label="Password">
            <Input
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </Field>
          <Field label="Confirm Password">
            <Input
              name="confirm"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </Field>
          <Button type="submit" className="mt-2 w-full" disabled={signupPending}>
            {signupPending ? "Creating account…" : "Sign Up"}
          </Button>
        </form>
      )}

      {(state?.error || queryError) && (
        <p className="mt-4 text-center text-sm text-destructive">
          {state?.error ?? queryError}
        </p>
      )}
      {state?.notice && (
        <p className="mt-4 text-center text-sm text-emerald-600">{state.notice}</p>
      )}

      {/* Divider */}
      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* Google */}
      <form action={loginWithGoogle}>
        <Button type="submit" variant="outline" className="w-full">
          <GoogleIcon />
          Continue with Google
        </Button>
      </form>
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

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
