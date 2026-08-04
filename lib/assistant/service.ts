import "server-only";

import OpenAI from "openai";
import {
  ASSISTANT_MAX_OUTPUT_TOKENS,
  ASSISTANT_TIMEOUT_MS,
  getOpenAiModel,
  OPENAI_MODERATION_MODEL,
} from "./config";
import { AssistantUnavailableError, type AssistantAiClient } from "./core";

function isInvalidModelError(error: unknown): boolean {
  return error instanceof OpenAI.APIError
    && (
      error.code === "model_not_found"
      || (error.param === "model" && (error.status === 400 || error.status === 404))
    );
}

export function createOpenAiAssistantClient(apiKey: string): AssistantAiClient {
  const client = new OpenAI({ apiKey });
  return {
    async isFlagged(input) {
      const moderation = await client.moderations.create(
        { model: OPENAI_MODERATION_MODEL, input },
        { signal: AbortSignal.timeout(ASSISTANT_TIMEOUT_MS) },
      );
      return moderation.results.some((result) => result.flagged);
    },
    async createResponse({ instructions, message, history }) {
      const conversation = history
        .map((item) => `${item.role === "user" ? "USER" : "ASSISTANT"}: ${item.content}`)
        .concat(`USER: ${message}`)
        .join("\n");
      try {
        const response = await client.responses.create(
          {
            model: getOpenAiModel(),
            instructions,
            input: conversation,
            max_output_tokens: ASSISTANT_MAX_OUTPUT_TOKENS,
            store: false,
            text: { verbosity: "low" },
          },
          { signal: AbortSignal.timeout(ASSISTANT_TIMEOUT_MS) },
        );
        return response.output_text.trim();
      } catch (error) {
        if (isInvalidModelError(error)) {
          throw new AssistantUnavailableError();
        }
        throw error;
      }
    },
  };
}
