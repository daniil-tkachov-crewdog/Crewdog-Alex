import { redirect } from "next/navigation";
import { AdminHeader } from "@/admin/components/admin-header";
import { AdminView } from "@/admin/components/admin-view";
import {
  getAdminIdentity,
  fetchUsers,
  fetchUsageSummary,
  fetchTickets,
} from "@/admin/data";
import { getSystemPromptTemplate } from "@/widget/data/system-prompt-config";
import {
  resolveSearchToolConfig,
  resolveSummaryToolConfig,
} from "@/widget/data/tool-config";
import { checkAlexHealth } from "@/admin/health";

export const metadata = { title: "Admin — Crewdog Alex" };

// Admin data is live and cross-tenant; never cache the page.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Signed-out users are bounced to /login by the proxy; signed-in non-admins
  // land here and get sent to their dashboard. The panel stays invisible.
  const admin = await getAdminIdentity();
  if (!admin) redirect("/dashboard");

  const [users, usage, tickets, systemPrompt, searchConfig, summaryConfig, health] =
    await Promise.all([
      fetchUsers(),
      fetchUsageSummary(30),
      fetchTickets(),
      getSystemPromptTemplate(),
      resolveSearchToolConfig(),
      resolveSummaryToolConfig(),
      checkAlexHealth(),
    ]);

  return (
    <div className="flex min-h-dvh flex-col bg-muted/20">
      <AdminHeader email={admin.email} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        <AdminView
          users={users}
          usage={usage}
          tickets={tickets}
          systemPrompt={systemPrompt}
          searchConfig={searchConfig}
          summaryConfig={summaryConfig}
          health={health}
        />
      </main>
    </div>
  );
}
