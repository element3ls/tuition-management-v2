import "server-only";

import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganizationId } from "@/lib/tenancy/server";

export type AIUsageStatus = "started" | "completed" | "failed";

export type AIUsageTokenCounts = {
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
};

type LogAIUsageEventInput = AIUsageTokenCounts & {
  organizationId?: string;
  examId?: string | null;
  runId?: string | null;
  provider?: string;
  model?: string | null;
  requestType: string;
  status: AIUsageStatus;
  responseId?: string | null;
  error?: string | null;
  metadata?: Record<string, unknown>;
};

function normalizedCount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function logAIUsageEvent(input: LogAIUsageEventInput) {
  if (isDemoMode() || !isSupabaseConfigured()) {
    return;
  }

  const supabase = createAdminClient();
  await supabase.from("ai_usage_events").insert({
    organization_id: input.organizationId ?? (await getCurrentOrganizationId()),
    exam_id: input.examId ?? null,
    run_id: input.runId ?? null,
    provider: input.provider ?? "openai",
    model: input.model ?? null,
    request_type: input.requestType,
    status: input.status,
    input_tokens: normalizedCount(input.inputTokens),
    output_tokens: normalizedCount(input.outputTokens),
    total_tokens: normalizedCount(input.totalTokens),
    response_id: input.responseId ?? null,
    error: input.error ?? null,
    metadata: input.metadata ?? {}
  });
}
