"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Rss,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import type { JobRow, JobColumnKey } from "@/shared/job-schema";
import { JOB_COLUMNS } from "@/shared/job-schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  clearFeedSchedule,
  deleteJobs,
  importJobsCsv,
  importJobsFeed,
  readCsv,
  readFeed,
  setJobsDisabled,
  updateJobs,
  type JobEdit,
} from "./actions";
import type { FeedField, FeedMapping } from "@/tool/ingest/feed/parse-feed";
import { UNMAPPED, GENERATE_ID } from "@/tool/ingest/column-mapping";
import {
  FEED_INTERVAL_HOURS,
  type FeedIntervalHours,
  type FeedSchedule,
} from "@/tool/ingest/feed/schedule";

type SourceKind = "csv" | "feed" | "scraping";

/** The 5 editable text columns (ID is handled separately for its dup flag). */
const EDIT_FIELDS: { key: keyof JobEdit; label: string }[] = [
  { key: "title", label: "Job title" },
  { key: "description", label: "Job description" },
  { key: "location", label: "Location" },
  { key: "salary", label: "Salary" },
  { key: "category", label: "Category" },
  { key: "job_link", label: "Job link" },
];

function toEdit(job: JobRow): JobEdit {
  return {
    row_id: job.row_id,
    id: job.id,
    title: job.title,
    description: job.description,
    location: job.location,
    salary: job.salary,
    category: job.category,
    job_link: job.job_link,
  };
}

/**
 * Import tab. Top block chooses an on-ramp and takes the CSV upload; the bottom
 * block is the job database table — select rows to reveal the Edit / Disable /
 * Delete bar, edit inline, disable (grey out) or delete. All writes go through
 * server actions scoped to the logged-in client_id.
 */
export function ImportTab({
  jobs,
  feedSchedule,
}: {
  jobs: JobRow[];
  feedSchedule: FeedSchedule | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // ── Import on-ramp state (shared column-mapping for CSV + feed) ───────
  // If a feed schedule is saved, the block opens locked onto that feed.
  const [source, setSource] = useState<SourceKind>(
    feedSchedule ? "feed" : "csv"
  );
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [feedUrl, setFeedUrl] = useState(feedSchedule?.url ?? "");
  // Discovered source columns (feed tags or CSV headers) + their preview rows.
  const [feedFields, setFeedFields] = useState<FeedField[] | null>(null);
  const [feedItemCount, setFeedItemCount] = useState(0);
  const [mapping, setMapping] = useState<FeedMapping>(
    feedSchedule?.mapping ?? {}
  );

  // ── Auto-update (feed only) ───────────────────────────────────────────
  const [autoUpdate, setAutoUpdate] = useState<boolean>(
    feedSchedule?.enabled ?? false
  );
  const [intervalHours, setIntervalHours] = useState<FeedIntervalHours>(
    feedSchedule?.intervalHours ?? 24
  );
  // Locked = a schedule is saved; the block stays pinned to it until unlocked.
  const [locked, setLocked] = useState<boolean>(!!feedSchedule);

  // ── Table / editing state ─────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, JobEdit>>({});

  // ── Feedback state ────────────────────────────────────────────────────
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedIds = useMemo(() => [...selected], [selected]);
  const allSelected = jobs.length > 0 && selected.size === jobs.length;
  const someSelected = selected.size > 0 && !allSelected;
  const selectedJobs = jobs.filter((j) => selected.has(j.row_id));
  const allSelectedDisabled =
    selectedJobs.length > 0 && selectedJobs.every((j) => j.disabled);

  // Duplicate-ID detection across the current table (drafts override edited rows).
  const idCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const job of jobs) {
      const id = (drafts[job.row_id]?.id ?? job.id).trim();
      if (id) m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  }, [jobs, drafts]);

  function draftIdError(rowId: string): "empty" | "dup" | null {
    const d = drafts[rowId];
    if (!d) return null;
    const id = d.id.trim();
    if (!id) return "empty";
    if ((idCounts.get(id) ?? 0) > 1) return "dup";
    return null;
  }

  const hasInvalidEdits =
    editing && Object.keys(drafts).some((r) => draftIdError(r) !== null);

  function afterWrite() {
    setSelected(new Set());
    setEditing(false);
    setDrafts({});
    router.refresh();
  }

  // ── Selection ─────────────────────────────────────────────────────────
  function toggleRow(rowId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(jobs.map((j) => j.row_id)));
  }

  // ── Actions ───────────────────────────────────────────────────────────
  function startEditing() {
    const initial: Record<string, JobEdit> = {};
    for (const job of selectedJobs) initial[job.row_id] = toEdit(job);
    setDrafts(initial);
    setEditing(true);
  }

  function setDraftField(rowId: string, key: keyof JobEdit, value: string) {
    setDrafts((prev) => ({ ...prev, [rowId]: { ...prev[rowId], [key]: value } }));
  }

  function saveEdits() {
    if (hasInvalidEdits) return;
    const edits = Object.values(drafts);
    startTransition(async () => {
      const res = await updateJobs(edits);
      if (res.ok) {
        setNotice(res.message ?? "Changes saved.");
        afterWrite();
      } else {
        setErrorMsg(res.error);
      }
    });
  }

  function toggleDisabled() {
    const target = !allSelectedDisabled;
    startTransition(async () => {
      const res = await setJobsDisabled(selectedIds, target);
      if (res.ok) {
        setNotice(
          target
            ? `Disabled ${selectedIds.length} job${selectedIds.length === 1 ? "" : "s"}.`
            : `Enabled ${selectedIds.length} job${selectedIds.length === 1 ? "" : "s"}.`
        );
        afterWrite();
      } else {
        setErrorMsg(res.error);
      }
    });
  }

  function runDelete() {
    startTransition(async () => {
      const res = await deleteJobs(selectedIds);
      setConfirmDelete(false);
      if (res.ok) {
        setNotice(res.message ?? "Deleted.");
        afterWrite();
      } else {
        setErrorMsg(res.error);
      }
    });
  }

  // ── Shared column mapping (CSV headers + feed tags) ───────────────────
  function resetMapping() {
    setFeedFields(null);
    setFeedItemCount(0);
    setMapping({});
  }

  function setMappingField(col: JobColumnKey, tag: string) {
    setMapping((prev) => {
      const next = { ...prev };
      if (tag === UNMAPPED) delete next[col];
      else next[col] = tag;
      return next;
    });
  }

  const foundNotice = (itemCount: number, fieldCount: number) =>
    `Found ${itemCount} job${itemCount === 1 ? "" : "s"} and ${fieldCount} column${fieldCount === 1 ? "" : "s"}. Match them to your columns below.`;

  // ── CSV on-ramp ───────────────────────────────────────────────────────
  function runReadCsv() {
    if (!file) return;
    startTransition(async () => {
      const text = await file.text();
      const res = await readCsv(text);
      if (res.ok) {
        setFeedFields(res.fields);
        setFeedItemCount(res.itemCount);
        setMapping(res.suggested);
        setNotice(foundNotice(res.itemCount, res.fields.length));
      } else {
        resetMapping();
        setErrorMsg(res.error);
      }
    });
  }

  function runImportCsv() {
    if (!file || !mapping.id) return;
    startTransition(async () => {
      const text = await file.text();
      const res = await importJobsCsv(text, mapping);
      if (res.ok) {
        setNotice(res.message ?? "Imported.");
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
        resetMapping();
        router.refresh();
      } else {
        setErrorMsg(res.error);
      }
    });
  }

  // ── Feed Link ─────────────────────────────────────────────────────────
  function runReadFeed() {
    if (!feedUrl.trim()) return;
    startTransition(async () => {
      const res = await readFeed(feedUrl);
      if (res.ok) {
        setFeedFields(res.fields);
        setFeedItemCount(res.itemCount);
        setMapping(res.suggested);
        setNotice(foundNotice(res.itemCount, res.fields.length));
      } else {
        resetMapping();
        setErrorMsg(res.error);
      }
    });
  }

  function runImportFeed() {
    if (!feedFields || !mapping.id) return;
    startTransition(async () => {
      const res = await importJobsFeed(
        feedUrl,
        mapping,
        autoUpdate ? { intervalHours } : null
      );
      if (res.ok) {
        setNotice(
          autoUpdate
            ? `${res.message ?? "Imported."} Auto-update is on (every ${intervalHours}h).`
            : (res.message ?? "Imported.")
        );
        if (autoUpdate) {
          // Keep the block pinned to this live feed.
          setLocked(true);
        } else {
          setFeedUrl("");
          resetMapping();
        }
        router.refresh();
      } else {
        setErrorMsg(res.error);
      }
    });
  }

  // Turn auto-update off and unlock the block for editing again.
  function unlockFeed() {
    startTransition(async () => {
      const res = await clearFeedSchedule();
      if (res.ok) {
        setLocked(false);
        setAutoUpdate(false);
        resetMapping();
        setFeedUrl("");
        setNotice(res.message ?? "Auto-update turned off.");
        router.refresh();
      } else {
        setErrorMsg(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Block 1: choose on-ramp + upload ──────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Import your jobs</CardTitle>
          <CardDescription>
            Choose how to bring your job listings into Alex.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {locked ? (
            /* Locked: pinned to a live auto-updating feed until the user changes it. */
            <div className="flex flex-col gap-4 rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="bg-accent text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
                    <Rss className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      Auto-updating from a feed
                    </p>
                    <p className="text-muted-foreground truncate text-sm" title={feedUrl}>
                      {feedUrl}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Every {intervalHours} hours
                      {feedSchedule?.lastRunAt
                        ? ` · last updated ${new Date(feedSchedule.lastRunAt).toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  Auto Update on
                </Badge>
              </div>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={unlockFeed}
                  disabled={pending}
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Change feed
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex w-full max-w-xs flex-col gap-1.5">
                  <Label>Import method</Label>
                  <Select
                    value={source}
                    onValueChange={(v) => {
                      setSource(v as SourceKind);
                      resetMapping();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV file</SelectItem>
                      <SelectItem value="feed">Feed Link (RSS / Atom)</SelectItem>
                      <SelectItem value="scraping" disabled>
                        Scraping (coming soon)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {source === "csv" && (
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(e) => {
                        setFile(e.target.files?.[0] ?? null);
                        resetMapping();
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileRef.current?.click()}
                      disabled={pending}
                    >
                      <UploadCloud className="size-4" />
                      Choose CSV
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={runReadCsv}
                      disabled={!file || pending}
                    >
                      {pending && !feedFields ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Read columns
                    </Button>
                    <span className="text-muted-foreground text-sm">
                      {file ? file.name : "Choose a CSV, then read its columns to map them."}
                    </span>
                  </div>
                )}

                {source === "feed" && (
                  <div className="flex w-full flex-wrap items-end gap-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <Label htmlFor="feed-url">Feed URL</Label>
                      <Input
                        id="feed-url"
                        type="url"
                        inputMode="url"
                        placeholder="https://boards.example.com/jobs.rss"
                        value={feedUrl}
                        onChange={(e) => {
                          setFeedUrl(e.target.value);
                          if (feedFields) resetMapping();
                        }}
                        disabled={pending}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={runReadFeed}
                      disabled={!feedUrl.trim() || pending}
                    >
                      {pending && !feedFields ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Rss className="size-4" />
                      )}
                      Read feed
                    </Button>
                  </div>
                )}
              </div>

              {/* Column mapping — appears once columns have been read (CSV or feed). */}
              {feedFields && (
                <div className="flex flex-col gap-4 rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-medium">
                      Match {source === "feed" ? "feed fields" : "CSV columns"} to your
                      columns
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {feedItemCount} job{feedItemCount === 1 ? "" : "s"} found. Pick
                      which source column fills each field — leave any as{" "}
                      <span className="font-medium">Don&apos;t import</span> to skip it.
                      ID is required; choose <span className="font-medium">Generate ID</span>{" "}
                      to create one automatically.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {JOB_COLUMNS.map((col) => {
                      const value = mapping[col.key] ?? UNMAPPED;
                      const isId = col.key === "id";
                      const isGenerated = isId && mapping.id === GENERATE_ID;
                      const sample = feedFields.find(
                        (f) => f.tag === mapping[col.key]
                      )?.sample;
                      return (
                        <div key={col.key} className="flex flex-col gap-1.5">
                          <Label>
                            {col.label}
                            {isId && <span className="text-destructive"> *</span>}
                          </Label>
                          <Select
                            value={value}
                            onValueChange={(v) => setMappingField(col.key, v)}
                          >
                            <SelectTrigger
                              className={cn(
                                isId && !mapping.id && "border-destructive"
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {/* Generate ID pinned to the top of the ID column. */}
                              {isId && (
                                <SelectItem value={GENERATE_ID}>
                                  Generate ID
                                </SelectItem>
                              )}
                              {!isId && (
                                <SelectItem value={UNMAPPED}>
                                  Don&apos;t import
                                </SelectItem>
                              )}
                              {feedFields.map((f) => (
                                <SelectItem key={f.tag} value={f.tag}>
                                  {f.tag}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isGenerated ? (
                            <span className="text-muted-foreground text-xs">
                              Auto-generated from each job&apos;s content.
                            </span>
                          ) : sample ? (
                            <span
                              className="text-muted-foreground truncate text-xs"
                              title={sample}
                            >
                              e.g. {sample}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {/* Auto Update — feed only. */}
                  {source === "feed" && (
                    <div className="flex flex-col gap-3 rounded-md border bg-muted/40 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">Auto Update</p>
                          <p className="text-muted-foreground text-xs">
                            Re-pull this feed automatically on a schedule.
                          </p>
                        </div>
                        <Switch
                          aria-label="Auto Update"
                          checked={autoUpdate}
                          onCheckedChange={setAutoUpdate}
                          disabled={pending}
                        />
                      </div>
                      {autoUpdate && (
                        <div className="flex w-full max-w-xs flex-col gap-1.5">
                          <Label>Update every</Label>
                          <Select
                            value={String(intervalHours)}
                            onValueChange={(v) =>
                              setIntervalHours(Number(v) as FeedIntervalHours)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FEED_INTERVAL_HOURS.map((h) => (
                                <SelectItem key={h} value={String(h)}>
                                  {h} hours
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      onClick={source === "feed" ? runImportFeed : runImportCsv}
                      disabled={!mapping.id || pending}
                    >
                      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                      Import {feedItemCount} job{feedItemCount === 1 ? "" : "s"}
                    </Button>
                    {!mapping.id && (
                      <span className="text-muted-foreground text-sm">
                        Map a column to ID (or choose Generate ID) to import.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Block 2: job database ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Job database</CardTitle>
          <CardDescription>
            {jobs.length > 0
              ? `${jobs.length} job${jobs.length === 1 ? "" : "s"} in your database.`
              : "No jobs imported yet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {notice && (
            <div className="text-primary bg-accent flex items-center justify-between rounded-md px-3 py-2 text-sm">
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                aria-label="Dismiss"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          {/* Selection action bar — appears when ≥1 row is selected. */}
          {selected.size > 0 && (
            <div className="bg-secondary flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
              <span className="text-secondary-foreground text-sm font-medium">
                {selected.size} selected
              </span>
              <div className="mx-1 h-5 w-px bg-border" />

              {editing ? (
                <>
                  {hasInvalidEdits && (
                    <span className="text-destructive flex items-center gap-1 text-sm">
                      <AlertTriangle className="size-4" />
                      Fix duplicate or empty IDs to save
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(false);
                        setDrafts({});
                      }}
                      disabled={pending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={saveEdits}
                      disabled={pending || hasInvalidEdits}
                    >
                      {pending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Save changes
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={startEditing}
                    disabled={pending}
                  >
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleDisabled}
                    disabled={pending}
                  >
                    {allSelectedDisabled ? (
                      <>
                        <Eye className="size-4" />
                        Enable
                      </>
                    ) : (
                      <>
                        <EyeOff className="size-4" />
                        Disable
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmDelete(true)}
                    disabled={pending}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          )}

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="Select all"
                      checked={allSelected}
                      indeterminate={someSelected}
                      onCheckedChange={toggleAll}
                      disabled={editing || jobs.length === 0}
                    />
                  </TableHead>
                  {JOB_COLUMNS.map((c) => (
                    <TableHead key={c.key} className="whitespace-nowrap">
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={JOB_COLUMNS.length + 1}
                      className="text-muted-foreground py-12 text-center"
                    >
                      Import a CSV to populate this table.
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs.map((job) => {
                    const isEditing = editing && !!drafts[job.row_id];
                    const draft = drafts[job.row_id];
                    const idErr = draftIdError(job.row_id);

                    return (
                      <TableRow
                        key={job.row_id}
                        data-state={
                          selected.has(job.row_id) ? "selected" : undefined
                        }
                        className={cn(
                          job.disabled && !isEditing && "opacity-50"
                        )}
                      >
                        <TableCell className="align-top">
                          <Checkbox
                            aria-label={`Select job ${job.id}`}
                            checked={selected.has(job.row_id)}
                            onCheckedChange={() => toggleRow(job.row_id)}
                            disabled={editing}
                          />
                        </TableCell>

                        {isEditing ? (
                          <>
                            <TableCell className="align-top">
                              <Textarea
                                value={draft.id}
                                onChange={(e) =>
                                  setDraftField(job.row_id, "id", e.target.value)
                                }
                                className={cn(
                                  "min-h-16 w-28 font-mono text-xs",
                                  idErr &&
                                    "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30"
                                )}
                              />
                              {idErr && (
                                <p className="text-destructive mt-1 text-xs">
                                  {idErr === "dup"
                                    ? "Duplicate ID"
                                    : "ID required"}
                                </p>
                              )}
                            </TableCell>
                            {EDIT_FIELDS.map((f) => (
                              <TableCell key={f.key} className="align-top">
                                <Textarea
                                  value={draft[f.key]}
                                  onChange={(e) =>
                                    setDraftField(
                                      job.row_id,
                                      f.key,
                                      e.target.value
                                    )
                                  }
                                  className="min-h-16 w-full min-w-40"
                                />
                              </TableCell>
                            ))}
                          </>
                        ) : (
                          <>
                            <TableCell className="align-top font-mono text-xs">
                              <div className="flex items-center gap-2">
                                {job.id}
                                {job.disabled && (
                                  <Badge variant="secondary">Disabled</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="align-top font-medium whitespace-nowrap">
                              {job.title}
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-xs min-w-56 align-top">
                              <span className="line-clamp-2" title={job.description}>
                                {job.description}
                              </span>
                            </TableCell>
                            <TableCell className="align-top whitespace-nowrap">
                              {job.location}
                            </TableCell>
                            <TableCell className="align-top whitespace-nowrap">
                              {job.salary}
                            </TableCell>
                            <TableCell className="align-top whitespace-nowrap">
                              {job.category ? (
                                <Badge variant="secondary">{job.category}</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="align-top">
                              {job.job_link ? (
                                <a
                                  href={job.job_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary inline-flex max-w-[12rem] items-center gap-1 hover:underline"
                                >
                                  <span className="truncate">{job.job_link}</span>
                                  <ExternalLink className="size-3 shrink-0" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── CSV error dialog ──────────────────────────────────────────── */}
      <Dialog open={errorMsg !== null} onClose={() => setErrorMsg(null)}>
        <div className="flex items-start gap-3">
          <div className="text-destructive bg-destructive/10 flex size-9 shrink-0 items-center justify-center rounded-full">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <DialogTitle>Something went wrong</DialogTitle>
            <DialogDescription>{errorMsg}</DialogDescription>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button type="button" onClick={() => setErrorMsg(null)}>
            Got it
          </Button>
        </div>
      </Dialog>

      {/* ── Delete confirmation ───────────────────────────────────────── */}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>
          Delete {selected.size} job{selected.size === 1 ? "" : "s"}?
        </DialogTitle>
        <DialogDescription>
          This permanently removes the selected job
          {selected.size === 1 ? "" : "s"} from your database and Supabase. This
          can&apos;t be undone.
        </DialogDescription>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setConfirmDelete(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={runDelete}
            disabled={pending}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
