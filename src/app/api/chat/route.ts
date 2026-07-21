import type { NextRequest } from "next/server";
import { getLLM, type ChatMessage } from "@/widget/llm";
import { resolveSystemPrompt } from "@/widget/data/system-prompt-config";
import { recordUsage } from "@/widget/data/usage";
import { getClientConfigById } from "@/widget/data/client-config";
import { buildSearchJobsTool, makeSearchJobsHandler } from "@/widget/search-tool";
import { SUMMARIZE_JOBS_TOOL, makeSummarizeJobsHandler } from "@/widget/summary-tool";
import {
  resolveSearchToolConfig,
  resolveSummaryToolConfig,
} from "@/widget/data/tool-config";
import type { ToolSpec, ToolHandler } from "@/widget/llm";

/**
 * POST /api/chat — the widget orchestrator.
 *
 * Public endpoint (job hunters never log in). Flow:
 *   1. Resolve the tenant from client_id (branding + subscription gate).
 *   2. Refuse to serve inactive/unknown tenants.
 *   3. Prepend the branded system prompt, expose the search_jobs tool, and
 *      let the LLM (behind the swappable interface) run the conversation.
 *
 * The LLM never touches the DB — search_jobs' handler does, always scoped to
 * this tenant's client_id.
 */

interface ChatRequestBody {
  client_id?: string;
  messages?: ChatMessage[];
}

const ALLOWED_ROLES = new Set(["user", "assistant"]);

export async function POST(request: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const clientId = typeof body.client_id === "string" ? body.client_id.trim() : "";
  if (!clientId) {
    return Response.json({ error: "Missing client_id." }, { status: 400 });
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  // Only trust user/assistant turns from the client; the system prompt is ours.
  const history = incoming.filter(
    (m): m is ChatMessage =>
      !!m &&
      ALLOWED_ROLES.has(m.role) &&
      typeof m.content === "string" &&
      m.content.trim().length > 0
  );

  if (history.length === 0) {
    return Response.json({ error: "No message to respond to." }, { status: 400 });
  }

  // Resolve tenant + gate. Unknown or unpaid clients are not served.
  const client = await getClientConfigById(clientId);
  if (!client) {
    return Response.json({ error: "Unknown assistant." }, { status: 404 });
  }
  if (!client.active) {
    return Response.json(
      { error: "This assistant isn't active right now." },
      { status: 403 }
    );
  }

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: await resolveSystemPrompt({
        assistantName: client.assistantName,
        boardName: client.boardName,
      }),
    },
    ...history,
  ];

  // Resolve admin tool config once per request; both tools share the read.
  const [searchConfig, summaryConfig] = await Promise.all([
    resolveSearchToolConfig(),
    resolveSummaryToolConfig(),
  ]);

  const tools: ToolSpec[] = [buildSearchJobsTool(searchConfig)];
  const handlers: Record<string, ToolHandler> = {
    search_jobs: makeSearchJobsHandler(client.clientId, searchConfig),
  };
  // The summary tool is admin-toggleable; only expose it when enabled.
  if (summaryConfig.enabled) {
    tools.push(SUMMARIZE_JOBS_TOOL);
    handlers.summarize_jobs = makeSummarizeJobsHandler(client.clientId, summaryConfig);
  }

  try {
    const llm = getLLM();
    const { reply, usage } = await llm.complete(messages, { tools, handlers });
    // Best-effort usage telemetry; never blocks or breaks the reply.
    await recordUsage(client.clientId, usage);
    return Response.json({ reply });
  } catch (err) {
    // Keep the real reason server-side; the client gets a safe message.
    console.error("[/api/chat] LLM error:", err);
    return Response.json(
      { error: "Alex is having trouble responding right now." },
      { status: 502 }
    );
  }
}
