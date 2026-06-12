import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getOpenAIEnv, getOpenAIWebhookSecret } from "@/lib/env";
import { finalizeExamProcessing } from "@/lib/exams/ai";

export async function POST(request: Request) {
  const body = await request.text();
  try {
    const { apiKey } = getOpenAIEnv();
    const client = new OpenAI({ apiKey, webhookSecret: getOpenAIWebhookSecret() });
    const event = await client.webhooks.unwrap(body, request.headers);
    if (
      event.type === "response.completed" ||
      event.type === "response.failed" ||
      event.type === "response.incomplete" ||
      event.type === "response.cancelled"
    ) {
      await finalizeExamProcessing(event.data.id);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid OpenAI webhook." },
      { status: 400 }
    );
  }
}
