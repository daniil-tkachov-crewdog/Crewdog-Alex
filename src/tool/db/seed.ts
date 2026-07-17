import type { ClientConfig } from "@/shared/client-id";
import type { JobRow } from "@/shared/job-schema";

/**
 * Seeded dev tenant. With auth deferred there is no logged-in account to
 * resolve a client_id from, so localhost operates as this single tenant.
 * When real auth lands, this is the ONLY thing that changes — the config
 * gets resolved from the session instead of read from here.
 */
export const DEV_CLIENT_ID = "dev-client-0001";

export const seedClientConfig: ClientConfig = {
  client_id: DEV_CLIENT_ID,
  branding: {
    assistant_name: "Alex",
    board_name: "Acme Jobs",
    logo_url: null,
    instructions: null,
  },
  subscription_status: "active",
  data_source: "csv",
  is_live: false,
};

/** A few sample rows so the Import table isn't empty in dev. */
export const seedJobs: JobRow[] = [
  {
    row_id: "seed-1024",
    id: "1024",
    client_id: DEV_CLIENT_ID,
    title: "Senior Frontend Engineer",
    description: "Own the design system and ship the marketing site.",
    location: "London (Hybrid)",
    salary: "£70k–£85k",
    category: "Software",
    job_link: "https://acme.example/jobs/1024",
    disabled: false,
  },
  {
    row_id: "seed-1025",
    id: "1025",
    client_id: DEV_CLIENT_ID,
    title: "Product Designer",
    description: "End-to-end product design across web and mobile.",
    location: "Remote (UK)",
    salary: "£55k–£65k",
    category: "Design",
    job_link: "https://acme.example/jobs/1025",
    disabled: false,
  },
  {
    row_id: "seed-1026",
    id: "1026",
    client_id: DEV_CLIENT_ID,
    title: "Data Analyst",
    description: "Turn product data into decisions the team can act on.",
    location: "Manchester",
    salary: "£45k–£52k",
    category: "Data",
    job_link: "https://acme.example/jobs/1026",
    disabled: false,
  },
];

/** Placeholder usage numbers for the Overview token meter (real usage: Track A). */
export const seedUsage = {
  tokensUsed: 132_000,
  tokenLimit: 500_000,
};
