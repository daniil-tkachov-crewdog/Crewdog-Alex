"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Crown, ShieldCheck, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { PLANS } from "@/shared/plans";
import type { AdminUser, UsageSummary, AccountTier } from "@/admin/data";
import { formatTokens, formatUsd } from "@/admin/format";
import { setPremium } from "@/app/(admin)/admin/actions";

/** Monthly token limit implied by an account tier (free = no plan). */
function tierLimit(tier: AccountTier): number {
  const plan = PLANS.find((p) => p.id === tier);
  return plan?.tokenLimit ?? 0;
}

const tierLabel: Record<AccountTier, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  scale: "Scale",
};

export function UsersTab({
  users,
  usage,
}: {
  users: AdminUser[];
  usage: UsageSummary;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  // Local mirror of premium state so toggles feel instant before revalidation.
  const [premium, setPremiumState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(users.map((u) => [u.clientId, u.isPremium]))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>
          {users.length} account{users.length === 1 ? "" : "s"}. Expand a row for
          usage, limits and premium controls.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client ID</TableHead>
              <TableHead>Company name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No accounts yet.
                </TableCell>
              </TableRow>
            )}
            {users.map((u) => {
              const isOpen = openId === u.id;
              const isPremium = premium[u.clientId] ?? u.isPremium;
              return (
                <UserRows
                  key={u.id}
                  user={u}
                  isOpen={isOpen}
                  isPremium={isPremium}
                  clientUsage={usage.byClient[u.clientId]}
                  windowDays={usage.windowDays}
                  onToggleOpen={() => setOpenId(isOpen ? null : u.id)}
                  onPremiumChange={(v) =>
                    setPremiumState((s) => ({ ...s, [u.clientId]: v }))
                  }
                />
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function UserRows({
  user,
  isOpen,
  isPremium,
  clientUsage,
  windowDays,
  onToggleOpen,
  onPremiumChange,
}: {
  user: AdminUser;
  isOpen: boolean;
  isPremium: boolean;
  clientUsage: UsageSummary["byClient"][string] | undefined;
  windowDays: number;
  onToggleOpen: () => void;
  onPremiumChange: (v: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const used = clientUsage?.totalTokens ?? 0;
  const cost = clientUsage?.costUsd ?? 0;
  const requests = clientUsage?.requests ?? 0;
  const limit = tierLimit(user.tier);
  const unlimited = isPremium;
  const usedPct = unlimited || limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));

  function toggle() {
    const next = !isPremium;
    setError(null);
    onPremiumChange(next); // optimistic
    startTransition(async () => {
      const res = await setPremium(user.clientId, next);
      if (!res.ok) {
        onPremiumChange(!next); // revert
        setError(res.error);
      }
    });
  }

  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggleOpen}>
        <TableCell className="font-mono text-xs">{user.clientId}</TableCell>
        <TableCell>{user.companyName || "—"}</TableCell>
        <TableCell>{user.email || "—"}</TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5">
            <Badge variant={user.tier === "free" ? "secondary" : "default"}>
              {tierLabel[user.tier]}
            </Badge>
            {isPremium && (
              <Badge className="gap-1 bg-status-amber/15 text-status-amber">
                <Crown className="size-3" /> Premium
              </Badge>
            )}
            {user.isAdmin && (
              <Badge variant="outline" className="gap-1">
                <ShieldCheck className="size-3" /> Admin
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </TableCell>
      </TableRow>

      {isOpen && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={5} className="bg-muted/30">
            <div className="grid gap-6 p-2 sm:grid-cols-2">
              {/* Usage + limits */}
              <div>
                <h4 className="mb-2 text-sm font-medium">
                  AI API usage · last {windowDays} days
                </h4>
                <div className="mb-2 flex items-baseline justify-between text-sm">
                  <span className="font-medium">
                    {formatTokens(used)}{" "}
                    <span className="text-muted-foreground">
                      / {unlimited ? "Unlimited" : limit === 0 ? "No plan" : formatTokens(limit)}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    {requests} req · {formatUsd(cost)}
                  </span>
                </div>
                {unlimited ? (
                  <div className="rounded-md bg-status-amber/10 px-3 py-2 text-xs text-status-amber">
                    Premium — unlimited usage, no billing.
                  </div>
                ) : limit === 0 ? (
                  <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                    Free account — no paid plan. Upgrade or grant premium below.
                  </div>
                ) : (
                  <Progress
                    value={usedPct}
                    indicatorClassName={
                      usedPct >= 90
                        ? "bg-status-red"
                        : usedPct >= 75
                          ? "bg-status-amber"
                          : "bg-primary"
                    }
                  />
                )}
              </div>

              {/* Premium switch */}
              <div>
                <h4 className="mb-2 text-sm font-medium">Premium access</h4>
                <p className="mb-3 text-xs text-muted-foreground">
                  Grants unlimited API usage and waives billing for this account.
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant={isPremium ? "outline" : "default"}
                    size="sm"
                    disabled={pending}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle();
                    }}
                  >
                    {pending && <Loader2 className="size-4 animate-spin" />}
                    {isPremium ? "Revoke premium" : "Make premium"}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Currently {isPremium ? "premium" : "standard"}
                  </span>
                </div>
                {error && <p className="mt-2 text-xs text-status-red">{error}</p>}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
