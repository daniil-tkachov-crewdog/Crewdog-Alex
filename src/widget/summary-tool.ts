import type { ToolSpec, ToolHandler } from "@/widget/llm";
import { summarizeJobs, type JobSummary } from "@/widget/data/summarize-jobs";
import type { SummaryToolConfig } from "@/widget/data/tool-config";

/**
 * ── THE summarize_jobs TOOL ──────────────────────────────────────────
 *
 * The counterpart to search_jobs. Where search_jobs REQUIRES a title +
 * location (so Alex can't fish), summarize_jobs takes NO required params — Alex
 * may call it freely to learn what the board actually holds, then steer a vague
 * user ("we've lots of nursing and hospitality, mostly in London") before it
 * has enough to search. Returns aggregate counts, never individual jobs.
 */
export const SUMMARIZE_JOBS_TOOL: ToolSpec = {
  name: "summarize_jobs",
  description:
    "Get an overview of what jobs this board currently has — total count, the " +
    "main job types or categories, and the main locations — WITHOUT returning " +
    "individual listings. Use this to orient yourself or the user before you " +
    "know enough to call search_jobs (e.g. the user is unsure what they want, " +
    "or asks what's available). Optionally narrow to one location.",
  parameters: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description:
          "Optional. Narrow the overview to a location, e.g. 'London'. Omit for the whole board.",
      },
    },
    required: [],
    additionalProperties: false,
  },
};

function formatSummary(summary: JobSummary): string {
  if (summary.total === 0) {
    return "This board currently has no live jobs matching that. Tell the user nothing's available right now.";
  }

  const facetLabel = summary.facet === "category" ? "Categories" : "Job types";
  const itemLine = summary.items.length
    ? summary.items.map((i) => `${i.label} (${i.count})`).join(", ")
    : "n/a";
  const locLine = summary.locations.length
    ? summary.locations.map((l) => `${l.label} (${l.count})`).join(", ")
    : "n/a";

  return (
    `This board has ${summary.total} live job(s).\n` +
    `${facetLabel}: ${itemLine}\n` +
    `Locations: ${locLine}\n` +
    `Use this to steer the conversation — do NOT present these counts as a job list or invent listings; ` +
    `call search_jobs once you know a title and location.`
  );
}

/**
 * Build the handler bound to one tenant. Like search, the clientId comes from
 * the resolved request context, never the model.
 */
export function makeSummarizeJobsHandler(
  clientId: string,
  config?: SummaryToolConfig
): ToolHandler {
  return async (args) => {
    const location = typeof args.location === "string" ? args.location : undefined;
    const summary = await summarizeJobs(clientId, { location }, config);
    return formatSummary(summary);
  };
}
