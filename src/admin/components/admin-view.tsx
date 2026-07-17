"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "./overview-tab";
import { UsersTab } from "./users-tab";
import { SettingsTab } from "./settings-tab";
import { TicketsTab } from "./tickets-tab";
import type { AdminUser, SupportTicket, UsageSummary } from "@/admin/data";
import type { HealthReport } from "@/admin/health";
import type {
  SearchToolConfig,
  SummaryToolConfig,
} from "@/widget/data/tool-config";

/** Top-level admin panel shell: the four-section tab bar. */
export function AdminView({
  users,
  usage,
  tickets,
  systemPrompt,
  searchConfig,
  summaryConfig,
  health,
}: {
  users: AdminUser[];
  usage: UsageSummary;
  tickets: SupportTicket[];
  systemPrompt: string;
  searchConfig: SearchToolConfig;
  summaryConfig: SummaryToolConfig;
  health: HealthReport;
}) {
  const [tab, setTab] = useState("overview");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin panel</h1>
        <p className="text-muted-foreground">
          Internal controls for Crewdog Alex. Visible to admins only.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="tickets">Support tickets</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab usage={usage} health={health} />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab users={users} usage={usage} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab
            systemPrompt={systemPrompt}
            searchConfig={searchConfig}
            summaryConfig={summaryConfig}
          />
        </TabsContent>
        <TabsContent value="tickets">
          <TicketsTab tickets={tickets} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
