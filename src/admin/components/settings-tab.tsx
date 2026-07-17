"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Search, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  saveSystemPrompt,
  saveSearchConfig,
  saveSummaryConfig,
} from "@/app/(admin)/admin/actions";
import type {
  SearchToolConfig,
  SummaryToolConfig,
} from "@/widget/data/tool-config";

export function SettingsTab({
  systemPrompt,
  searchConfig,
  summaryConfig,
}: {
  systemPrompt: string;
  searchConfig: SearchToolConfig;
  summaryConfig: SummaryToolConfig;
}) {
  return (
    <div className="flex flex-col gap-6">
      <SystemPromptCard systemPrompt={systemPrompt} />
      <SearchToolCard initial={searchConfig} />
      <SummaryToolCard initial={summaryConfig} />
    </div>
  );
}

/** Small hook: a save button's transient state (pending / saved / error). */
function useSaver() {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(res.error);
      }
    });
  }

  return { pending, saved, error, run };
}

function SaveButton({
  pending,
  saved,
  dirty,
  onClick,
  label = "Save",
}: {
  pending: boolean;
  saved: boolean;
  dirty: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button onClick={onClick} disabled={pending || !dirty}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {saved && !pending && <Check className="size-4" />}
      {saved && !pending ? "Saved" : label}
    </Button>
  );
}

// ── System prompt ────────────────────────────────────────────────────────────

function SystemPromptCard({ systemPrompt }: { systemPrompt: string }) {
  const [value, setValue] = useState(systemPrompt);
  const { pending, saved, error, run } = useSaver();
  const dirty = value !== systemPrompt;

  return (
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
          <SaveButton
            pending={pending}
            saved={saved}
            dirty={dirty}
            onClick={() => run(() => saveSystemPrompt(value))}
            label="Save prompt"
          />
          {dirty && !pending && (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          )}
          {error && <span className="text-xs text-status-red">{error}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Search tool ──────────────────────────────────────────────────────────────

function SearchToolCard({ initial }: { initial: SearchToolConfig }) {
  const [cfg, setCfg] = useState<SearchToolConfig>(initial);
  const { pending, saved, error, run } = useSaver();
  const dirty = JSON.stringify(cfg) !== JSON.stringify(initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="size-4" />
          Search tool
        </CardTitle>
        <CardDescription>
          How Alex searches the job index when it calls{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            search_jobs
          </code>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Match strategy" hint="Fuzzy adds typo tolerance to full-text search.">
            <Select
              value={cfg.matchStrategy}
              onValueChange={(v) =>
                setCfg({ ...cfg, matchStrategy: v as SearchToolConfig["matchStrategy"] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keyword">Keyword (full-text)</SelectItem>
                <SelectItem value="fuzzy">Keyword + fuzzy (recommended)</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Results per search" hint="Max jobs returned (1–25).">
            <Input
              type="number"
              min={1}
              max={25}
              value={cfg.resultsPerSearch}
              onChange={(e) =>
                setCfg({ ...cfg, resultsPerSearch: Number(e.target.value) })
              }
            />
          </Field>

          <Field
            label="Minimum relevance score"
            hint="Drop weak matches below this. 0 keeps everything."
          >
            <Input
              type="number"
              min={0}
              max={5}
              step={0.05}
              value={cfg.minScore}
              onChange={(e) => setCfg({ ...cfg, minScore: Number(e.target.value) })}
            />
          </Field>

          <Field label="Include disabled jobs" hint="Off is safer — disabled jobs stay hidden.">
            <label className="flex h-9 items-center gap-2 text-sm">
              <Checkbox
                checked={cfg.includeDisabled}
                onCheckedChange={(v) => setCfg({ ...cfg, includeDisabled: v === true })}
              />
              {cfg.includeDisabled ? "Included" : "Excluded"}
            </label>
          </Field>
        </div>

        <div className="flex items-center gap-3">
          <SaveButton
            pending={pending}
            saved={saved}
            dirty={dirty}
            onClick={() => run(() => saveSearchConfig(cfg))}
            label="Save search settings"
          />
          {dirty && !pending && (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          )}
          {error && <span className="text-xs text-status-red">{error}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Summary tool ─────────────────────────────────────────────────────────────

function SummaryToolCard({ initial }: { initial: SummaryToolConfig }) {
  const [cfg, setCfg] = useState<SummaryToolConfig>(initial);
  const { pending, saved, error, run } = useSaver();
  const dirty = JSON.stringify(cfg) !== JSON.stringify(initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4" />
          Summary tool
        </CardTitle>
        <CardDescription>
          The overview Alex gets when it calls{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            summarize_jobs
          </code>{" "}
          to orient a user. Boards at or above the threshold are summarized by
          category instead of by job title.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field label="Enabled" hint="Turn the summary tool on or off for all boards.">
          <label className="flex h-9 items-center gap-2 text-sm">
            <Checkbox
              checked={cfg.enabled}
              onCheckedChange={(v) => setCfg({ ...cfg, enabled: v === true })}
            />
            {cfg.enabled ? "On" : "Off"}
          </label>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Category threshold"
            hint="Live-job count at which the digest switches from titles to categories."
          >
            <Input
              type="number"
              min={1}
              max={100000}
              value={cfg.countThreshold}
              onChange={(e) => setCfg({ ...cfg, countThreshold: Number(e.target.value) })}
              disabled={!cfg.enabled}
            />
          </Field>

          <Field label="Max items per facet" hint="Top-N cap on locations and titles/categories.">
            <Input
              type="number"
              min={1}
              max={100}
              value={cfg.maxItems}
              onChange={(e) => setCfg({ ...cfg, maxItems: Number(e.target.value) })}
              disabled={!cfg.enabled}
            />
          </Field>
        </div>

        <div className="flex items-center gap-3">
          <SaveButton
            pending={pending}
            saved={saved}
            dirty={dirty}
            onClick={() => run(() => saveSummaryConfig(cfg))}
            label="Save summary settings"
          />
          {dirty && !pending && (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          )}
          {error && <span className="text-xs text-status-red">{error}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}
