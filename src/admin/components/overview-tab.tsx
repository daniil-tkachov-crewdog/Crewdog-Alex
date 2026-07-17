"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusLight } from "@/tool/components/status-light";
import { cn } from "@/lib/utils";
import type { UsageSummary } from "@/admin/data";
import type { HealthReport } from "@/admin/health";
import { formatTokens, formatUsd, formatShortDate, formatDateTime } from "@/admin/format";

const probeDot: Record<"ok" | "fail", string> = {
  ok: "bg-status-green",
  fail: "bg-status-red",
};

export function OverviewTab({
  usage,
  health,
}: {
  usage: UsageSummary;
  health: HealthReport;
}) {
  const maxDay = Math.max(1, ...usage.byDay.map((d) => d.totalTokens));
  const firstDay = usage.byDay[0]?.date;
  const lastDay = usage.byDay[usage.byDay.length - 1]?.date;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Block 1: Total API usage ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Total API usage</CardTitle>
              <CardDescription>
                GPT usage across all accounts · last {usage.windowDays} days
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="font-display text-3xl font-semibold tracking-tight">
                {formatUsd(usage.totalCostUsd)}
              </div>
              <div className="text-xs text-muted-foreground">Total spend</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Stat row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Total tokens" value={formatTokens(usage.totalTokens)} />
            <Stat label="Prompt tokens" value={formatTokens(usage.promptTokens)} />
            <Stat label="Completion tokens" value={formatTokens(usage.completionTokens)} />
            <Stat label="Requests" value={formatTokens(usage.requests)} />
          </div>

          {/* Daily bar chart (OpenAI-style) */}
          <div>
            <div
              className="flex h-44 items-end gap-1"
              role="img"
              aria-label={`Daily token usage over the last ${usage.windowDays} days`}
            >
              {usage.byDay.map((d) => {
                const pct = (d.totalTokens / maxDay) * 100;
                return (
                  <div
                    key={d.date}
                    className="group relative flex-1"
                    title={`${formatShortDate(d.date)} · ${formatTokens(
                      d.totalTokens
                    )} tokens · ${formatUsd(d.costUsd)}`}
                  >
                    <div
                      className={cn(
                        "w-full rounded-t-sm transition-colors",
                        d.totalTokens > 0
                          ? "bg-primary group-hover:bg-primary/80"
                          : "bg-muted"
                      )}
                      style={{ height: `${Math.max(pct, d.totalTokens > 0 ? 3 : 1)}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{firstDay ? formatShortDate(firstDay) : ""}</span>
              <span>{lastDay ? formatShortDate(lastDay) : ""}</span>
            </div>
          </div>

          {usage.totalTokens === 0 ? (
            <p className="text-sm text-muted-foreground">
              No usage recorded yet. Usage is tracked from every chat request and
              will populate here as candidates talk to Alex.
            </p>
          ) : (
            <div>
              <h3 className="mb-2 text-sm font-medium">By model</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usage.byModel.map((m) => (
                    <TableRow key={m.model}>
                      <TableCell className="font-mono text-xs">{m.model}</TableCell>
                      <TableCell className="text-right">{formatTokens(m.requests)}</TableCell>
                      <TableCell className="text-right">{formatTokens(m.totalTokens)}</TableCell>
                      <TableCell className="text-right">{formatUsd(m.costUsd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Block 2: Alex health status ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Alex health status</CardTitle>
              <CardDescription>
                Live checks of the chatbot stack (all tenants). Refreshes on reload.
              </CardDescription>
            </div>
            <StatusLight tone={health.tone} label={health.label} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ul className="flex flex-col divide-y">
            {health.probes.map((p) => (
              <li key={p.name} className="flex items-start gap-3 py-2.5">
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    probeDot[p.ok ? "ok" : "fail"]
                  )}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {p.name}{" "}
                    <span
                      className={cn(
                        "text-xs font-normal",
                        p.ok ? "text-status-green" : "text-status-red"
                      )}
                    >
                      {p.ok ? "OK" : "Issue"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground break-words">
                    {p.detail}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Last checked {formatDateTime(health.checkedAt)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="font-display text-lg font-semibold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
