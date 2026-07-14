import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import type { ChatMessage, CompleteOptions, LLMProvider } from "./types";

/**
 * OpenAI implementation of the LLM interface. The API key is server-side only
 * (Render env var OPENAI_API_KEY) and never reaches the browser. The model is
 * overridable via OPENAI_MODEL so it can be tuned without a code change.
 *
 * Tool loop: when tools + handlers are given, we let the model call them,
 * feed the results back, and repeat until it produces a normal reply (capped
 * so a misbehaving model can't loop forever).
 */
export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  private static readonly MAX_TOOL_ROUNDS = 4;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    this.client = new OpenAI({ apiKey });
    this.model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  }

  async complete(
    messages: ChatMessage[],
    options?: CompleteOptions
  ): Promise<string> {
    const convo: ChatCompletionMessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const tools: ChatCompletionTool[] | undefined = options?.tools?.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    for (let round = 0; round <= OpenAIProvider.MAX_TOOL_ROUNDS; round++) {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: convo,
        ...(tools ? { tools, tool_choice: "auto" } : {}),
      });

      const message = completion.choices[0]?.message;
      const toolCalls = message?.tool_calls ?? [];

      // No tool calls (or no handlers to run them): return the text reply.
      if (toolCalls.length === 0 || !options?.handlers) {
        return message?.content?.trim() ?? "";
      }

      // Record the assistant's tool-call turn, then answer each call.
      convo.push(message);
      for (const call of toolCalls) {
        if (call.type !== "function") continue;
        const handler = options.handlers[call.function.name];
        let result = "That tool is not available.";
        if (handler) {
          try {
            const args = JSON.parse(call.function.arguments || "{}");
            result = await handler(args);
          } catch {
            result = "The tool could not be run with those arguments.";
          }
        }
        convo.push({
          role: "tool",
          tool_call_id: call.id,
          content: result,
        });
      }
    }

    // Ran out of tool rounds — ask once more for a plain answer.
    const finalMessage = convo[convo.length - 1];
    return typeof finalMessage?.content === "string" ? finalMessage.content : "";
  }
}
