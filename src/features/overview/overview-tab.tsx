"use client";

import { useState } from "react";
import { Copy, Check, Rocket, Power } from "lucide-react";
import type { ClientConfig } from "@/shared/client-id";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusLight } from "@/components/app/status-light";
import { computeHealth } from "./health";

/** Base host the embed script is served from (placeholder until the widget deploys). */
const WIDGET_HOST = "https://widget.crewdogalex.com";

export function OverviewTab({
  config,
  hasJobs,
  usage,
}: {
  config: ClientConfig;
  hasJobs: boolean;
  usage: { tokensUsed: number; tokenLimit: number };
}) {
  // Local "live" state so the Start button visibly flips things for now.
  const [isLive, setIsLive] = useState(config.is_live);
  const [copied, setCopied] = useState(false);

  const health = computeHealth(
    { subscription_status: config.subscription_status, is_live: isLive },
    hasJobs
  );

  const usedPct = Math.min(
    100,
    Math.round((usage.tokensUsed / usage.tokenLimit) * 100)
  );
  const remainingPct = 100 - usedPct;

  const script = `<script src="${WIDGET_HOST}/widget.js" data-client-id="${config.client_id}"></script>`;

  async function copyScript() {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Block 1: health */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Chatbot health</CardTitle>
              <CardDescription>{health.detail}</CardDescription>
            </div>
            <StatusLight tone={health.tone} label={health.label} />
          </div>
        </CardHeader>
        <CardContent>
          <Button
            variant={isLive ? "outline" : "default"}
            onClick={() => setIsLive((v) => !v)}
            disabled={config.subscription_status === "inactive" || !hasJobs}
          >
            {isLive ? (
              <>
                <Power className="size-4" /> Stop
              </>
            ) : (
              <>
                <Rocket className="size-4" /> Start
              </>
            )}
          </Button>
          {!hasJobs && (
            <p className="mt-2 text-xs text-muted-foreground">
              Import jobs before starting.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Block 2: token usage */}
      <Card>
        <CardHeader>
          <CardTitle>Token usage</CardTitle>
          <CardDescription>
            Tokens used by job hunters this billing period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="font-medium">
              {usage.tokensUsed.toLocaleString()} /{" "}
              {usage.tokenLimit.toLocaleString()}
            </span>
            <span className="text-muted-foreground">{remainingPct}% left</span>
          </div>
          <Progress
            value={usedPct}
            indicatorClassName={
              remainingPct <= 10
                ? "bg-status-red"
                : remainingPct <= 25
                  ? "bg-status-amber"
                  : "bg-primary"
            }
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Placeholder usage — live numbers arrive once the assistant engine
            reports them.
          </p>
        </CardContent>
      </Card>

      {/* Block 3: integration script */}
      <Card>
        <CardHeader>
          <CardTitle>Integration script</CardTitle>
          <CardDescription>
            Paste this one line into your site&apos;s HTML to embed Alex.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-md border bg-muted px-3 py-2 font-mono text-xs whitespace-nowrap">
              {script}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={copyScript}
              aria-label="Copy script"
            >
              {copied ? (
                <Check className="size-4 text-status-green" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
