# Feed-URL on-ramp

On-demand import from a job board's RSS 2.0 or Atom feed, with tenant-driven
column mapping (boards don't agree on where location / salary / company live, so
the tenant maps the feed's own tags onto the internal job fields once, rather
than us guessing per board).

## Flow

1. Tenant pastes a feed URL and clicks **Read feed** → `readFeed(url)` server
   action fetches the XML server-side (dodges CORS), and `discoverFields` lists
   the tags present on the feed's items with a sample value + a best-guess
   default mapping.
2. Tenant maps each DB column to a feed tag (or "Don't import") and clicks
   **Import** → `importJobsFeed(url, mapping)` re-fetches, `parseFeed` projects
   every item through the mapping, and the shared upsert tail
   (`writeParsedJobs`) categorizes blanks and upserts on `(client_id,
   source_id)` — exactly like the CSV path.

## Files

- `parse-feed.ts` — pure, network-free RSS/Atom reader: `discoverFields(xml)`
  and `parseFeed(xml, mapping)`. Handles RSS `<item>` and Atom `<entry>`,
  CDATA, namespaced tags, Atom `<link href>`, and HTML-strips text values. No
  external XML dependency.
- Server actions live in `../../features/import/actions.ts`.

## Notes

- `id` must be mapped (it's the upsert/dedup key); every item must yield a
  non-empty value for it. Default-mapped to `guid`, falling back to `link`.
- `salary` / `location` frequently have no matching feed tag — left unmapped
  they import blank, which the schema allows.
- Scheduled re-polling is **not** built here — import is manual/on-demand, same
  interaction model as CSV. Auto-refresh on a cron worker is a possible
  follow-up.
