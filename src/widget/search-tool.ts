import type { ToolSpec, ToolHandler } from "@/widget/llm";
import { searchJobs, type JobSearchResult } from "@/widget/data/search-jobs";
import type { SearchToolConfig } from "@/widget/data/tool-config";
import type { SearchableJobColumn } from "@/shared/job-schema";

/**
 * ── THE search_jobs TOOL ─────────────────────────────────────────────
 *
 * The tool's parameters are BUILT FROM the admin's "essential search columns"
 * config: each essential column becomes a REQUIRED parameter. That's the hard
 * enforcement of the clarifying-questions rule — the model literally cannot
 * call the tool until it has gathered a value for every essential field, and it
 * cannot search on a column the admin didn't mark essential. Change the columns
 * in the admin panel and both the tool's shape and the query change with it.
 */

/** Per-column prompt copy the model sees. Keyed by the whitelisted columns. */
const COLUMN_PARAM: Record<SearchableJobColumn, { description: string }> = {
  title: {
    description: "Job title or field, e.g. 'frontend engineer', 'nurse'.",
  },
  location: {
    description:
      "Desired location, e.g. 'London', 'India', 'Anywhere'. Use the place the " +
      "user named; only use 'Remote' if the board itself labels roles that way.",
  },
  salary: {
    description: "Salary expectation as free text, e.g. '£50k+'.",
  },
  description: {
    description:
      "Keywords describing the role's responsibilities or required skills, " +
      "e.g. 'React and GraphQL', 'wound care'.",
  },
  category: {
    description: "Coarse job family, e.g. 'Healthcare', 'Engineering'.",
  },
};

/**
 * Build the search_jobs tool spec for the given config. Every essential column
 * is a required string parameter; the tool matches only on those columns.
 */
export function buildSearchJobsTool(config: SearchToolConfig): ToolSpec {
  const properties: Record<string, unknown> = {};
  for (const col of config.searchColumns) {
    properties[col] = { type: "string", description: COLUMN_PARAM[col].description };
  }

  return {
    name: "search_jobs",
    description:
      "Search this job board's live listings and return matching jobs with links. " +
      "Only call this once you know a value for every parameter below — ask the " +
      "user for anything still missing first.",
    parameters: {
      type: "object",
      properties,
      required: [...config.searchColumns],
      additionalProperties: false,
    },
  };
}

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
 * beyond its own board. Only the config's essential columns are read off the
 * model's args; anything else it sends is ignored.
 */
export function makeSearchJobsHandler(
  clientId: string,
  config: SearchToolConfig
): ToolHandler {
  return async (args) => {
    const criteria: Partial<Record<SearchableJobColumn, string>> = {};
    for (const col of config.searchColumns) {
      if (typeof args[col] === "string") criteria[col] = args[col] as string;
    }
    const results = await searchJobs(clientId, criteria, config);
    return formatResults(results);
  };
}
