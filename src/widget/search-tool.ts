import type { ToolSpec, ToolHandler } from "@/widget/llm";
import { searchJobs, type JobSearchResult } from "@/widget/data/search-jobs";

/**
 * ── THE search_jobs TOOL ─────────────────────────────────────────────
 *
 * This is the HARD enforcement of the clarifying-questions rule. `title` and
 * `location` are REQUIRED, so the model literally cannot call the tool until
 * it has gathered them from the user — no amount of prompt-ignoring gets
 * around a missing required parameter. `salary` and `remote` are optional.
 */
export const SEARCH_JOBS_TOOL: ToolSpec = {
  name: "search_jobs",
  description:
    "Search this job board's live listings and return matching jobs with links. " +
    "Only call this once you know the desired job title/field AND a location " +
    "(use 'Remote' as the location if the user wants remote work).",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Job title or field, e.g. 'frontend engineer', 'nurse'.",
      },
      location: {
        type: "string",
        description:
          "Desired location, e.g. 'London', 'Manchester'. Use 'Remote' for remote roles.",
      },
      salary: {
        type: "string",
        description: "Optional salary expectation as free text, e.g. '£50k+'.",
      },
      remote: {
        type: "boolean",
        description: "Optional; true if the user specifically wants remote work.",
      },
    },
    required: ["title", "location"],
    additionalProperties: false,
  },
};

function formatResults(results: JobSearchResult[]): string {
  if (results.length === 0) {
    return "No matching jobs were found for those criteria. Suggest the user broaden the title or try a different location.";
  }
  const lines = results.map(
    (j, i) =>
      `${i + 1}. ${j.title} — ${j.location}${j.salary ? ` — ${j.salary}` : ""}: ${j.job_link}`
  );
  return `Found ${results.length} matching job(s). Share these as links:\n${lines.join("\n")}`;
}

/**
 * Build the handler bound to one tenant. The clientId comes from the resolved
 * request context, NOT from the model — the model can never widen the search
 * beyond its own board.
 */
export function makeSearchJobsHandler(clientId: string): ToolHandler {
  return async (args) => {
    const results = await searchJobs(clientId, {
      title: typeof args.title === "string" ? args.title : "",
      location: typeof args.location === "string" ? args.location : "",
      salary: typeof args.salary === "string" ? args.salary : undefined,
      remote: typeof args.remote === "boolean" ? args.remote : undefined,
    });
    return formatResults(results);
  };
}
