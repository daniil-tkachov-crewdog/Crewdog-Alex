import { getCurrentClientConfig } from "@/tool/db/current-client";
import { createClient } from "@/lib/supabase/server";
import { SettingsView } from "@/tool/features/settings/settings-view";

export const metadata = { title: "Settings — Crewdog Alex" };

export default async function SettingsPage() {
  const config = await getCurrentClientConfig();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <SettingsView
      config={config}
      email={user?.email ?? ""}
      // Placeholder current plan until Stripe is wired.
      currentPlanId="pro"
    />
  );
}
