import OpenAI from "openai";

/**
 * ── JOB CATEGORIZATION ───────────────────────────────────────────────
 *
 * Derives a coarse job family ("Healthcare", "Hospitality", "Software",
 * "Administration", …) from a job's title/description with one cheap LLM pass.
 * Run at import and whenever an edit leaves the category blank, then STORED on
 * the row — never recomputed at search time.
 *
 * Best-effort by contract: if the key is missing, the model errors, or output
 * is malformed, every job falls back to "" (which the summary tool renders as
 * "Uncategorized"). Categorization must never block or fail a DB write.
 */

export interface CategorizeInput {
  title: string;
  description: string;
}

/** Jobs per model call. Keeps each request small and cheap on big imports. */
const BATCH_SIZE = 40;

function client(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function buildPrompt(items: CategorizeInput[]): string {
  const lines = items.map(
    (it, i) =>
      `${i + 1}. Title: ${it.title || "(none)"} | Description: ${(it.description || "").slice(0, 200)}`
  );
  return (
    "Assign each job a single, broad category (1-3 words, Title Case) naming its " +
    "field — e.g. Healthcare, Hospitality, Software, Administration, Construction, " +
    "Education, Finance, Retail, Logistics, Marketing. Reuse the same wording for " +
    "similar jobs so they group cleanly.\n\n" +
    lines.join("\n") +
    `\n\nReturn ONLY a JSON object: {"categories": ["...", ...]} with exactly ` +
    `${items.length} strings, in order.`
  );
}

async function categorizeBatch(
  openai: OpenAI,
  items: CategorizeInput[]
): Promise<string[]> {
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const completion = await openai.chat.completions.create({
    model,
    messages: [{ role: "user", content: buildPrompt(items) }],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  const parsed = JSON.parse(raw) as { categories?: unknown };
  const cats = Array.isArray(parsed.categories) ? parsed.categories : [];
  return items.map((_, i) => (typeof cats[i] === "string" ? (cats[i] as string).trim() : ""));
}

/**
 * Categorize a list of jobs, preserving order. Returns "" for any job that
 * couldn't be categorized (never throws).
 */
export async function categorizeJobs(items: CategorizeInput[]): Promise<string[]> {
  if (items.length === 0) return [];
  const openai = client();
  if (!openai) return items.map(() => "");

  const out: string[] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    try {
      const cats = await categorizeBatch(openai, batch);
      out.push(...cats);
    } catch (err) {
      console.error("[categorize] batch failed, leaving blank:", err);
      out.push(...batch.map(() => ""));
    }
  }
  return out;
}

/** Single-job convenience wrapper used by the edit path. */
export async function categorizeOne(item: CategorizeInput): Promise<string> {
  const [cat] = await categorizeJobs([item]);
  return cat ?? "";
}
