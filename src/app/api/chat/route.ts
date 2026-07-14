import type { NextRequest } from "next/server";
import { getLLM, type ChatMessage } from "@/widget/llm";
import { buildSystemPrompt, PLACEHOLDER_BRAND } from "@/widget/system-prompt";

/**
 * POST /api/chat — the widget orchestrator.
 *
 * Public endpoint (job hunters never log in). Takes the conversation so far,
 * prepends Alex's system prompt, calls the LLM behind the swappable interface,
 * and returns the reply for the widget to render.
 *
 * Slice 1: chat only. `client_id` is accepted but not yet used to resolve
 * branding, subscription gating, or job search — those land in later slices.
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
    return Response.json(
      { error: "No message to respond to." },
      { status: 400 }
    );
  }

  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(PLACEHOLDER_BRAND) },
    ...history,
  ];

  try {
    const llm = getLLM();
    const reply = await llm.complete(messages);
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
