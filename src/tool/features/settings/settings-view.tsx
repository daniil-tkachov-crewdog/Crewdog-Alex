"use client";

import { useState } from "react";
import type { ClientConfig } from "@/shared/client-id";
import type { Plan } from "@/shared/plans";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountTab } from "@/tool/features/account/account-tab";
import { BillingTab } from "@/tool/features/billing/billing-tab";

/** Settings shell holding the Account / Billing tabs. */
export function SettingsView({
  config,
  email,
  currentPlanId,
}: {
  config: ClientConfig;
  email: string;
  currentPlanId: Plan["id"];
}) {
  const [tab, setTab] = useState("account");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and subscription.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <AccountTab
            config={config}
            email={email}
            onGoToBilling={() => setTab("billing")}
          />
        </TabsContent>
        <TabsContent value="billing">
          <BillingTab
            status={config.subscription_status}
            currentPlanId={currentPlanId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
