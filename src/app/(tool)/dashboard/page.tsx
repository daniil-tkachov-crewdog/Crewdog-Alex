import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getCurrentClientConfig,
  getCurrentClientJobs,
  getCurrentClientUsage,
  getCurrentClientFeedSchedule,
} from "@/tool/db/current-client";
import { BrandingTab } from "@/tool/features/branding/branding-tab";
import { ImportTab } from "@/tool/features/import/import-tab";
import { OverviewTab } from "@/tool/features/overview/overview-tab";

export const metadata = { title: "Dashboard — Crewdog Alex" };

export default async function DashboardPage() {
  const [config, jobs, usage, feedSchedule] = await Promise.all([
    getCurrentClientConfig(),
    getCurrentClientJobs(),
    getCurrentClientUsage(),
    getCurrentClientFeedSchedule(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Configure Alex for {config.branding.board_name}.
        </p>
      </div>

      <Tabs defaultValue="branding">
        <TabsList>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="branding">
          <BrandingTab config={config} />
        </TabsContent>
        <TabsContent value="import">
          <ImportTab jobs={jobs} feedSchedule={feedSchedule} />
        </TabsContent>
        <TabsContent value="overview">
          <OverviewTab
            config={config}
            hasJobs={jobs.length > 0}
            usage={usage}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
