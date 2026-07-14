"use client";

import type { ClientConfig, SubscriptionStatus } from "@/shared/client-id";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusLight } from "@/components/app/status-light";
import { subscriptionTone, subscriptionLabel } from "@/features/billing/status";

/**
 * Account tab. Read-mostly account details plus subscription + delete actions.
 * Buttons are stubs for now (billing portal / delete land in phase 2).
 */
export function AccountTab({
  config,
  email,
  onGoToBilling,
}: {
  config: ClientConfig;
  email: string;
  onGoToBilling: () => void;
}) {
  const status: SubscriptionStatus = config.subscription_status;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your company and login details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex max-w-xl flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company">Company name</Label>
              <Input id="company" defaultValue={config.branding.board_name} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email used to login</Label>
              <Input id="email" type="email" defaultValue={email} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Subscription status</Label>
              <div className="flex items-center gap-3">
                <StatusLight
                  tone={subscriptionTone(status)}
                  label={subscriptionLabel(status)}
                />
                <Button variant="outline" size="sm" onClick={onGoToBilling}>
                  Change subscription
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive">Delete Account</Button>
        </CardContent>
      </Card>
    </div>
  );
}
