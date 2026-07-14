import OpenAI from "openai";
import type { ChatMessage, LLMProvider } from "./types";

/**
 * OpenAI implementation of the LLM interface. The API key is server-side only
 * (Render env var OPENAI_API_KEY) and never reaches the browser. The model is
 * overridable via OPENAI_MODEL so it can be tuned without a code change.
 */
export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    this.client = new OpenAI({ apiKey });
    this.model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  }

  async complete(messages: ChatMessage[]): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
    });

    return completion.choices[0]?.message?.content?.trim() ?? "";
  }
}
