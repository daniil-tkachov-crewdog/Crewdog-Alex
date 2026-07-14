import { AppHeader } from "@/components/app/app-header";

/** Shell for signed-in pages (dashboard + settings). */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/20">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        {children}
      </main>
    </div>
  );
}
