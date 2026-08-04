import { z } from "zod";

export const ASSISTANT_MESSAGE_MAX_LENGTH = 800;
export const ASSISTANT_HISTORY_MAX_ITEMS = 6;

const historyItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(500),
});

export const assistantRequestSchema = z.object({
  locale: z.enum(["tr", "en"]),
  message: z.string().trim().min(1).max(ASSISTANT_MESSAGE_MAX_LENGTH),
  history: z.array(historyItemSchema).max(ASSISTANT_HISTORY_MAX_ITEMS).default([]),
}).strict();

export type AssistantRequest = z.infer<typeof assistantRequestSchema>;

export const assistantResponseSchema = z.object({
  status: z.enum(["ok", "blocked", "out_of_scope", "unavailable", "error", "rate_limited"]),
  reply: z.string().trim().min(1).max(2_000),
  links: z.array(z.object({
    href: z.string().startsWith("/").max(300),
    label: z.string().trim().min(1).max(180),
  })).max(3),
});

export type AssistantResponse = z.infer<typeof assistantResponseSchema>;

