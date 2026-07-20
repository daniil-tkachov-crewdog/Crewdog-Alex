/**
 * Shared sentinels for the column-mapping UI/parsers (CSV + feed).
 *
 * A FeedMapping maps each internal job field to the name of a source column /
 * feed tag. Two values aren't real column names:
 *   UNMAPPED     — "Don't import this field" (leave it blank).
 *   GENERATE_ID  — only valid for `id`: derive a stable ID from job content
 *                  instead of reading a source column (see generate-id.ts).
 */

/** Select value meaning "don't map this column". */
export const UNMAPPED = "__none__";

/** Select value (ID column only) meaning "auto-generate a stable ID". */
export const GENERATE_ID = "__generate_id__";
