"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ChevronDown, Loader2, Search, Sparkles } from "lucide-react";
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
import {
  SEARCHABLE_JOB_COLUMNS,
  type SearchableJobColumn,
} from "@/shared/job-schema";

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

        <Field
          label="Essential search columns"
          hint="The columns a search must match on. Alex is asked for a value for each, and every one must match — pick fewer to widen results, more to tighten them."
        >
          <ColumnMultiSelect
            selected={cfg.searchColumns}
            onChange={(cols) => setCfg({ ...cfg, searchColumns: cols })}
          />
        </Field>

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

// ── Column multi-select ──────────────────────────────────────────────────────

/**
 * Dropdown list of the searchable job columns; the admin ticks which ones are
 * essential for a search. Closes on outside click. Guards against an empty
 * selection — the last remaining column can't be unticked, since a search needs
 * at least one column to match on.
 */
function ColumnMultiSelect({
  selected,
  onChange,
}: {
  selected: SearchableJobColumn[];
  onChange: (cols: SearchableJobColumn[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function toggle(key: SearchableJobColumn) {
    const isOn = selected.includes(key);
    // Never let the admin clear the last column — a search needs a dimension.
    if (isOn && selected.length === 1) return;
    const next = isOn
      ? selected.filter((k) => k !== key)
      : SEARCHABLE_JOB_COLUMNS.map((c) => c.key).filter(
          (k) => k === key || selected.includes(k)
        );
    onChange(next);
  }

  const summary =
    selected.length === 0
      ? "Select columns…"
      : SEARCHABLE_JOB_COLUMNS.filter((c) => selected.includes(c.key))
          .map((c) => c.label)
          .join(", ");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-left text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <span className="truncate">{summary}</span>
        <ChevronDown className="size-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {SEARCHABLE_JOB_COLUMNS.map((col) => {
            const isOn = selected.includes(col.key);
            const isLast = isOn && selected.length === 1;
            return (
              <label
                key={col.key}
                className={`flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground ${
                  isLast ? "cursor-not-allowed opacity-70" : ""
                }`}
              >
                <Checkbox
                  checked={isOn}
                  disabled={isLast}
                  onCheckedChange={() => toggle(col.key)}
                />
                {col.label}
              </label>
            );
          })}
        </div>
      )}
    </div>
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
