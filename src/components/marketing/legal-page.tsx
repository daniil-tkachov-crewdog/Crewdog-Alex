/** Shared shell for legal / info pages: centered, readable prose column. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {updated && (
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated {updated}
        </p>
      )}
      <div className="mt-8 flex flex-col gap-5 text-[15px] leading-relaxed text-muted-foreground [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_a]:text-primary [&_a]:underline">
        {children}
      </div>
    </div>
  );
}
