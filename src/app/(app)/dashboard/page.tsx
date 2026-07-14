import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getCurrentClientConfig,
  getCurrentClientJobs,
  getCurrentClientUsage,
} from "@/db/current-client";
import { BrandingTab } from "@/features/branding/branding-tab";
import { ImportTab } from "@/features/import/import-tab";
import { OverviewTab } from "@/features/overview/overview-tab";

export const metadata = { title: "Dashboard — Crewdog Alex" };

export default async function DashboardPage() {
  const [config, jobs, usage] = await Promise.all([
    getCurrentClientConfig(),
    getCurrentClientJobs(),
    getCurrentClientUsage(),
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
          <ImportTab jobs={jobs} />
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
