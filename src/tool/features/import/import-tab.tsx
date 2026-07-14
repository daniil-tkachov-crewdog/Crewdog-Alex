"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import type { Job } from "@/shared/job-schema";
import { JOB_COLUMNS } from "@/shared/job-schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

type SourceKind = "csv" | "feed" | "scraping";

/**
 * Import tab. Choose an on-ramp (CSV live; feed & scraping coming soon), then
 * the built-in table shows what's been imported. Parsing/persistence lands in
 * phase 2 (see src/ingest/csv); for now the table renders seeded rows.
 */
export function ImportTab({ jobs }: { jobs: Job[] }) {
  const [source, setSource] = useState<SourceKind>("csv");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-6">
      {/* Block 1: choose on-ramp */}
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
              <div className="flex items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) =>
                    setFileName(e.target.files?.[0]?.name ?? null)
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                >
                  <UploadCloud className="size-4" />
                  Choose CSV
                </Button>
                <span className="text-sm text-muted-foreground">
                  {fileName ?? "Columns: ID, Job title, Job description, Location, Salary"}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Block 2: imported data table */}
      <Card>
        <CardHeader>
          <CardTitle>Job database</CardTitle>
          <CardDescription>
            {jobs.length > 0
              ? `${jobs.length} job${jobs.length === 1 ? "" : "s"} imported.`
              : "No jobs imported yet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  {JOB_COLUMNS.map((c) => (
                    <TableHead key={c.key}>{c.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={JOB_COLUMNS.length}
                      className="py-10 text-center text-muted-foreground"
                    >
                      Import a CSV to populate this table.
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.id}</TableCell>
                      <TableCell>{job.title}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {job.description}
                      </TableCell>
                      <TableCell>{job.location}</TableCell>
                      <TableCell>{job.salary}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
