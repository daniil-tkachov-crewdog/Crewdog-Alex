import { getCurrentClientConfig } from "@/tool/db/current-client";
import { SettingsView } from "@/tool/features/settings/settings-view";

export const metadata = { title: "Settings — Crewdog Alex" };

export default async function SettingsPage() {
  const config = await getCurrentClientConfig();

  return (
    <SettingsView
      config={config}
      // Placeholder until auth: the email a dev team would have signed up with.
      email="you@acmejobs.com"
      // Placeholder current plan until Stripe is wired.
      currentPlanId="growth"
    />
  );
}
