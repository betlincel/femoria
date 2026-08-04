import "server-only";

export const DEFAULT_OPENAI_MODEL = "gpt-5-mini";
export const OPENAI_MODERATION_MODEL = "omni-moderation-latest";
export const ASSISTANT_TIMEOUT_MS = 12_000;
export const ASSISTANT_MAX_OUTPUT_TOKENS = 360;

export function getOpenAiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}
