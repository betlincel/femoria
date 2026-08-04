import type { Locale } from "../types";
import {
  assistantUi,
  buildAssistantInstructions,
  isAssistantScopeQuestion,
  looksLikePromptInjection,
  selectAssistantKnowledge,
  type AssistantKnowledgeLink,
} from "../content/assistant-content";

export interface AssistantAiClient {
  isFlagged(input: string): Promise<boolean>;
  createResponse(input: {
    instructions: string;
    message: string;
    history: Array<{ role: "user" | "assistant"; content: string }>;
  }): Promise<string>;
}

export class AssistantUnavailableError extends Error {
  constructor() {
    super("Assistant unavailable");
    this.name = "AssistantUnavailableError";
  }
}

export type AssistantResult =
  | { status: "ok"; reply: string; links: AssistantKnowledgeLink[] }
  | {
      status: "blocked" | "out_of_scope" | "unavailable" | "error";
      reply: string;
      links: AssistantKnowledgeLink[];
    };

export async function answerAssistant(input: {
  locale: Locale;
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  client: AssistantAiClient | null;
}): Promise<AssistantResult> {
  const { locale, message, history, client } = input;
  const ui = assistantUi[locale];
  const knowledge = selectAssistantKnowledge(message, locale);

  if (!client) {
    return { status: "unavailable", reply: ui.unavailable, links: knowledge.links };
  }

  try {
    if (await client.isFlagged(message)) {
      return { status: "blocked", reply: ui.blocked, links: [] };
    }
    if (looksLikePromptInjection(message)) {
      return { status: "blocked", reply: ui.blocked, links: [] };
    }
    if (!isAssistantScopeQuestion(message)) {
      return { status: "out_of_scope", reply: ui.outOfScope, links: knowledge.links };
    }

    const reply = await client.createResponse({
      instructions: buildAssistantInstructions(locale, knowledge.context),
      message,
      history,
    });
    if (!reply || await client.isFlagged(reply)) {
      return { status: "blocked", reply: ui.blocked, links: [] };
    }
    return { status: "ok", reply, links: knowledge.links };
  } catch (error) {
    if (error instanceof AssistantUnavailableError) {
      return { status: "unavailable", reply: ui.unavailable, links: knowledge.links };
    }
    return { status: "error", reply: ui.error, links: knowledge.links };
  }
}
