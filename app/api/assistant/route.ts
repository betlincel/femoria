import { NextRequest, NextResponse } from "next/server";
import { assistantUi } from "@/lib/content/assistant-content";
import { checkAssistantRateLimit } from "@/lib/assistant/rate-limit";
import { assistantRequestSchema } from "@/lib/assistant/schemas";
import { answerAssistant } from "@/lib/assistant/core";
import { createOpenAiAssistantClient } from "@/lib/assistant/service";

const MAX_BODY_BYTES = 6_000;

function requestKey(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "anonymous";
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { status: "error", reply: assistantUi.tr.error, links: [] },
      { status: 413 },
    );
  }

  const rate = checkAssistantRateLimit(requestKey(request));
  if (!rate.allowed) {
    return NextResponse.json(
      {
        status: "rate_limited",
        reply: "Çok hızlı istek gönderildi. Kısa bir süre sonra yeniden deneyin. / Too many requests. Please try again shortly.",
        links: [],
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { status: "error", reply: assistantUi.tr.error, links: [] },
        { status: 413 },
      );
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { status: "error", reply: assistantUi.tr.error, links: [] },
      { status: 400 },
    );
  }

  const parsed = assistantRequestSchema.safeParse(body);
  if (!parsed.success) {
    const locale = typeof body === "object" && body && "locale" in body && body.locale === "en" ? "en" : "tr";
    return NextResponse.json(
      { status: "error", reply: assistantUi[locale].error, links: [] },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const result = await answerAssistant({
    ...parsed.data,
    client: apiKey ? createOpenAiAssistantClient(apiKey) : null,
  });
  const status = result.status === "unavailable"
    ? 503
    : result.status === "error"
      ? 502
      : 200;
  return NextResponse.json(result, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
