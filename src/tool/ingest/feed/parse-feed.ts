/**
 * v1 Feed-Link on-ramp.
 *
 * Reads an RSS 2.0 or Atom feed and lets the tenant map the feed's own tags
 * onto the internal job fields (job boards don't agree on where location /
 * salary / company live, so we don't guess — the tenant maps once). Two entry
 * points:
 *
 *   discoverFields(xml)      → the tags present on the feed's items, each with a
 *                              sample value, for the mapping UI to render.
 *   parseFeed(xml, mapping)  → every item projected through that mapping into
 *                              the internal ParsedJobRow shape.
 *
 * Pure and network-free (the server action does the fetch). Mirrors the shape
 * and error style of ingest/csv/parse-csv.ts.
 */

/** A row parsed out of a feed, normalized to the internal job fields. */
export interface ParsedJobRow {
  id: string;
  title: string;
  description: string;
  location: string;
  salary: string;
  job_link: string;
  /** Optional on import. Blank rows are AI-categorized after upload. */
  category: string;
}

/** DB field → the feed tag name the tenant chose for it ("" / absent = unmapped). */
export type FeedMapping = Partial<Record<keyof ParsedJobRow, string>>;

/** One tag discovered on the feed's items, with an example value to preview. */
export interface FeedField {
  /** Tag name exactly as it appears in the feed, e.g. "guid", "media:thumbnail". */
  tag: string;
  /** First non-empty value seen for this tag, trimmed for display. */
  sample: string;
}

export type FeedReadResult =
  | { ok: true; fields: FeedField[]; itemCount: number; suggested: FeedMapping }
  | { ok: false; error: string };

export type FeedParseResult =
  | { ok: true; rows: ParsedJobRow[] }
  | { ok: false; error: string };

// ── XML scanning ────────────────────────────────────────────────────────
// A minimal, dependency-free scanner. It only ever looks at the *direct*
// children of each feed item, so HTML tags buried inside a <description> are
// never mistaken for feed fields.

interface Element {
  name: string;
  attrs: string;
  /** Raw inner XML (may contain CDATA / nested HTML). */
  inner: string;
}

/** Find the index of the '>' that closes the tag started at `lt`, respecting quotes. */
function findTagEnd(xml: string, lt: number): number {
  let quote = "";
  for (let i = lt + 1; i < xml.length; i++) {
    const ch = xml[i];
    if (quote) {
      if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ">") {
      return i;
    }
  }
  return -1;
}

/**
 * From `xml` starting at `from`, read forward until the matching `</name>`,
 * counting nested same-name opens and skipping CDATA/comments so HTML content
 * can't trip the close detection. Returns the inner content and the index just
 * past the close tag.
 */
function readUntilClose(
  xml: string,
  from: number,
  name: string
): { inner: string; end: number } {
  const target = name.toLowerCase();
  let depth = 1;
  let i = from;
  while (i < xml.length) {
    const lt = xml.indexOf("<", i);
    if (lt === -1) break;
    if (xml.startsWith("<!--", lt)) {
      const e = xml.indexOf("-->", lt);
      i = e === -1 ? xml.length : e + 3;
      continue;
    }
    if (xml.startsWith("<![CDATA[", lt)) {
      const e = xml.indexOf("]]>", lt);
      i = e === -1 ? xml.length : e + 3;
      continue;
    }
    const gt = findTagEnd(xml, lt);
    if (gt === -1) break;
    const tag = xml.slice(lt + 1, gt).trim();
    if (tag.startsWith("/")) {
      if (tag.slice(1).trim().toLowerCase() === target) {
        depth--;
        if (depth === 0) return { inner: xml.slice(from, lt), end: gt + 1 };
      }
    } else if (!tag.endsWith("/")) {
      const m = tag.match(/^([\w:.-]+)/);
      if (m && m[1].toLowerCase() === target) depth++;
    }
    i = gt + 1;
  }
  return { inner: xml.slice(from), end: xml.length };
}

/** Direct child elements of an item's inner XML, in document order. */
function topLevelChildren(inner: string): Element[] {
  const out: Element[] = [];
  let i = 0;
  while (i < inner.length) {
    const lt = inner.indexOf("<", i);
    if (lt === -1) break;
    if (inner.startsWith("<!--", lt)) {
      const e = inner.indexOf("-->", lt);
      i = e === -1 ? inner.length : e + 3;
      continue;
    }
    if (inner.startsWith("<![CDATA[", lt)) {
      const e = inner.indexOf("]]>", lt);
      i = e === -1 ? inner.length : e + 3;
      continue;
    }
    if (inner.startsWith("<?", lt)) {
      const e = inner.indexOf("?>", lt);
      i = e === -1 ? inner.length : e + 2;
      continue;
    }
    const gt = findTagEnd(inner, lt);
    if (gt === -1) break;
    let tag = inner.slice(lt + 1, gt);
    if (tag.startsWith("/")) {
      i = gt + 1;
      continue;
    }
    const selfClose = tag.endsWith("/");
    if (selfClose) tag = tag.slice(0, -1);
    const m = tag.match(/^([\w:.-]+)([\s\S]*)$/);
    if (!m) {
      i = gt + 1;
      continue;
    }
    const name = m[1];
    const attrs = m[2].trim();
    if (selfClose) {
      out.push({ name, attrs, inner: "" });
      i = gt + 1;
      continue;
    }
    const { inner: content, end } = readUntilClose(inner, gt + 1, name);
    out.push({ name, attrs, inner: content });
    i = end;
  }
  return out;
}

/** Pull the top-level <item> (RSS) or <entry> (Atom) blocks out of a feed. */
function extractItems(xml: string): string[] {
  const re = /<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  const items: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) items.push(m[2]);
  return items;
}

// ── Text normalization ───────────────────────────────────────────────────

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&hellip;/gi, "…")
    .replace(/&[lr]squo;/gi, "'")
    .replace(/&[lr]dquo;/gi, '"')
    .replace(/&amp;/gi, "&");
}

/** Concatenate all CDATA sections, or return the string as-is when there are none. */
function unwrapCdata(s: string): string {
  const re = /<!\[CDATA\[([\s\S]*?)\]\]>/g;
  let found = false;
  let out = "";
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    found = true;
    out += m[1];
  }
  return found ? out : s;
}

/** Strip tags, decode entities, and collapse whitespace to a single-line value. */
function toPlainText(raw: string): string {
  const noCdata = unwrapCdata(raw);
  const noTags = noCdata
    .replace(/<\s*br\s*\/?\s*>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6])\s*>/gi, " ")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(noTags).replace(/\s+/g, " ").trim();
}

/** Resolve one element to its display/import value (href wins when there's no text). */
function elementValue(el: Element): string {
  const text = toPlainText(el.inner);
  if (text) return text;
  // Atom <link href="..."/> and similar attribute-only elements.
  const href = el.attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i);
  if (href) return decodeEntities(href[1]).trim();
  return "";
}

/** First direct child element with the given tag name (case-insensitive). */
function pick(children: Element[], tag: string): Element | undefined {
  const t = tag.toLowerCase();
  return children.find((c) => c.name.toLowerCase() === t);
}

// ── Public API ─────────────────────────────────────────────────────────

/** Best-guess default mapping so common feeds are one click. */
function suggestMapping(fields: FeedField[]): FeedMapping {
  const has = (candidates: string[]): string | undefined => {
    for (const want of candidates) {
      const hit = fields.find((f) => {
        const local = f.tag.includes(":") ? f.tag.split(":").pop()! : f.tag;
        return local.toLowerCase() === want;
      });
      if (hit) return hit.tag;
    }
    return undefined;
  };
  const out: FeedMapping = {};
  const id = has(["guid", "id"]);
  const title = has(["title"]);
  const description = has(["description", "summary", "content", "content:encoded"]);
  const link = has(["link", "url"]);
  const location = has(["location", "region"]);
  const salary = has(["salary", "compensation"]);
  const category = has(["category", "type"]);
  if (id) out.id = id;
  if (title) out.title = title;
  if (description) out.description = description;
  if (link) out.job_link = link;
  if (location) out.location = location;
  if (salary) out.salary = salary;
  if (category) out.category = category;
  return out;
}

/**
 * Inspect a feed and report the tags available on its items. The union of tag
 * names across all items is returned (feeds sometimes omit empty tags on some
 * items), each with the first non-empty value seen as a preview sample.
 */
export function discoverFields(xml: string): FeedReadResult {
  if (!xml || xml.trim() === "") {
    return { ok: false, error: "The feed response was empty." };
  }

  const items = extractItems(xml);
  if (items.length === 0) {
    return {
      ok: false,
      error:
        "No job entries found in the feed. Make sure the URL points to an RSS or Atom feed with <item> or <entry> elements.",
    };
  }

  const order: string[] = [];
  const samples = new Map<string, string>();
  for (const item of items) {
    for (const child of topLevelChildren(item)) {
      if (!samples.has(child.name)) {
        order.push(child.name);
        samples.set(child.name, "");
      }
      if (!samples.get(child.name)) {
        const v = elementValue(child);
        if (v) samples.set(child.name, v.length > 140 ? v.slice(0, 140) + "…" : v);
      }
    }
  }

  const fields: FeedField[] = order.map((tag) => ({
    tag,
    sample: samples.get(tag) ?? "",
  }));

  return {
    ok: true,
    fields,
    itemCount: items.length,
    suggested: suggestMapping(fields),
  };
}

/**
 * Project every feed item through `mapping` into ParsedJobRow shape. `id` must
 * be mapped (it's the upsert/dedup key) and every item must yield a non-empty
 * value for it — errors are precise so the dashboard can show the exact reason.
 */
export function parseFeed(xml: string, mapping: FeedMapping): FeedParseResult {
  if (!mapping.id) {
    return {
      ok: false,
      error: "Map a feed field to ID first — it's used to identify each job.",
    };
  }

  const items = extractItems(xml);
  if (items.length === 0) {
    return { ok: false, error: "No job entries found in the feed." };
  }

  const valueOf = (children: Element[], field: keyof ParsedJobRow): string => {
    const tag = mapping[field];
    if (!tag) return "";
    const el = pick(children, tag);
    return el ? elementValue(el) : "";
  };

  const rows: ParsedJobRow[] = [];
  for (let i = 0; i < items.length; i++) {
    const children = topLevelChildren(items[i]);
    const id = valueOf(children, "id");
    if (id === "") {
      return {
        ok: false,
        error: `Entry ${i + 1}: the field mapped to ID ("${mapping.id}") is empty. Every job needs an ID — pick a field that's always present, like guid or link.`,
      };
    }
    rows.push({
      id,
      title: valueOf(children, "title"),
      description: valueOf(children, "description"),
      location: valueOf(children, "location"),
      salary: valueOf(children, "salary"),
      job_link: valueOf(children, "job_link"),
      category: valueOf(children, "category"),
    });
  }

  return { ok: true, rows };
}
