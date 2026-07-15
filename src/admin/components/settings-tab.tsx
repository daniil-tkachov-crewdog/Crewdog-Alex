"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Wrench } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveSystemPrompt } from "@/app/(admin)/admin/actions";

export function SettingsTab({ systemPrompt }: { systemPrompt: string }) {
  const [value, setValue] = useState(systemPrompt);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = value !== systemPrompt;

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await saveSystemPrompt(value);
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Block 1: System prompt ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>System prompt</CardTitle>
          <CardDescription>
            The instructions sent to the GPT model on every chat. Edits take
            effect on the next request. Use{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              {"{{assistantName}}"}
            </code>{" "}
            and{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              {"{{boardName}}"}
            </code>{" "}
            to insert each tenant&apos;s branding.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={16}
            spellCheck={false}
            className="font-mono text-sm leading-relaxed"
          />
          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={pending || !dirty}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {saved && !pending && <Check className="size-4" />}
              {saved && !pending ? "Saved" : "Save prompt"}
            </Button>
            {dirty && !pending && (
              <span className="text-xs text-muted-foreground">Unsaved changes</span>
            )}
            {error && <span className="text-xs text-status-red">{error}</span>}
          </div>
        </CardContent>
      </Card>

      {/* ── Block 2: Search tool (Coming soon) ───────────────────────── */}
      <Card className="opacity-70">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="size-4" />
                Search tool
              </CardTitle>
              <CardDescription>
                Controls for how Alex searches the job index.
              </CardDescription>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Coming soon
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="pointer-events-none flex flex-col gap-4 select-none">
            <PlaceholderField label="Match strategy" value="Semantic + keyword (hybrid)" />
            <PlaceholderField label="Results per search" value="5" />
            <PlaceholderField label="Minimum relevance score" value="0.35" />
            <PlaceholderField label="Include disabled jobs" value="No" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PlaceholderField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        {value}
      </div>
    </div>
  );
}
