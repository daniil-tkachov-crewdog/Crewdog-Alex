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
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import type { JobRow } from "@/shared/job-schema";
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
import { cn } from "@/lib/utils";
import {
  deleteJobs,
  importJobsCsv,
  setJobsDisabled,
  updateJobs,
  type JobEdit,
} from "./actions";

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
export function ImportTab({ jobs }: { jobs: JobRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // ── Import (CSV) state ────────────────────────────────────────────────
  const [source, setSource] = useState<SourceKind>("csv");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  function runImport() {
    if (!file) return;
    startTransition(async () => {
      const text = await file.text();
      const res = await importJobsCsv(text);
      if (res.ok) {
        setNotice(res.message ?? "Imported.");
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
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
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex w-full max-w-xs flex-col gap-1.5">
              <Label>Import method</Label>
              <Select
                value={source}
                onValueChange={(v) => setSource(v as SourceKind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV file</SelectItem>
                  <SelectItem value="feed" disabled>
                    Feed Link (coming soon)
                  </SelectItem>
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
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
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
                  onClick={runImport}
                  disabled={!file || pending}
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  Import
                </Button>
                <span className="text-muted-foreground text-sm">
                  {file
                    ? file.name
                    : "Columns: ID, Job title, Job description, Location, Salary, Job link + Category (optional)"}
                </span>
              </div>
            )}
          </div>
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
                    <TableHead key={c.key}>{c.label}</TableHead>
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
                            <TableCell className="align-top font-medium">
                              {job.title}
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-xs align-top">
                              <span className="line-clamp-2" title={job.description}>
                                {job.description}
                              </span>
                            </TableCell>
                            <TableCell className="align-top">
                              {job.location}
                            </TableCell>
                            <TableCell className="align-top">
                              {job.salary}
                            </TableCell>
                            <TableCell className="align-top">
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
