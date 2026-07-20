"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { SubscriptionStatus } from "@/shared/client-id";
import { PLANS, type Plan } from "@/shared/plans";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusLight } from "@/tool/components/status-light";
import { subscriptionTone, subscriptionLabel } from "./status";
import { cn } from "@/lib/utils";

/**
 * Billing tab. Shows subscription status and the three plans in a row with the
 * current one highlighted. Stripe checkout wiring lands in phase 2 (test mode).
 */
export function BillingTab({
  status,
  currentPlanId,
}: {
  status: SubscriptionStatus;
  currentPlanId: Plan["id"];
}) {
  const [selected, setSelected] = useState<Plan["id"]>(currentPlanId);

  return (
    <div className="flex flex-col gap-6">
      {/* Block 1: status */}
      <Card>
        <CardHeader className="pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <CardTitle>Subscription status</CardTitle>
              <CardDescription>
                Your current billing standing. An active subscription keeps Alex
                live.
              </CardDescription>
            </div>
            <StatusLight
              tone={subscriptionTone(status)}
              label={subscriptionLabel(status)}
              className="shrink-0"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Block 2: plans row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isSelected = plan.id === selected;
          return (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all",
                isSelected && "border-primary ring-1 ring-primary"
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                {isCurrent && <Badge variant="secondary">Current</Badge>}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-3xl font-semibold tracking-tight">
                  {plan.currency}
                  {plan.price}
                </span>
                <span className="text-sm text-muted-foreground">/ mo</span>
              </div>
              <ul className="mt-5 flex flex-1 flex-col gap-2.5 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Button
                  className="w-full"
                  variant={isSelected ? "default" : "outline"}
                  disabled={isCurrent}
                  onClick={() => setSelected(plan.id)}
                >
                  {isCurrent
                    ? "Current plan"
                    : isSelected
                      ? "Selected"
                      : `Switch to ${plan.name}`}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
