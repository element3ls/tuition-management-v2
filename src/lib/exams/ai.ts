import "server-only";

import { z } from "zod";
import { logAIUsageEvent, type AIUsageTokenCounts } from "@/lib/ai/usage";
import { logAudit } from "@/lib/audit/log";
import { getOpenAIEnv } from "@/lib/env";
import { importTeacherHtmlAnswers, mapTeacherAnswers } from "@/lib/exams/html";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganizationId } from "@/lib/tenancy/server";
import type { ExamIntakeMode, ExamProcessingStatus } from "@/types/domain";

const generatedExamSchema = z.object({
  questions: z
    .array(
      z.object({
        question_number: z.string().min(1),
        question_text: z.string().min(1),
        answer_text: z.string().nullable(),
        marks: z.number().int().min(0).nullable(),
        source_pages: z.array(z.number().int().positive()),
        review_warning: z.string().nullable(),
        requires_visual: z.boolean()
      })
    )
    .min(1)
});

const structuredOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["questions"],
  properties: {
    questions: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "question_number",
          "question_text",
          "answer_text",
          "marks",
          "source_pages",
          "review_warning",
          "requires_visual"
        ],
        properties: {
          question_number: { type: "string" },
          question_text: { type: "string" },
          answer_text: { anyOf: [{ type: "string" }, { type: "null" }] },
          marks: { anyOf: [{ type: "integer", minimum: 0 }, { type: "null" }] },
          source_pages: { type: "array", items: { type: "integer", minimum: 1 } },
          review_warning: { anyOf: [{ type: "string" }, { type: "null" }] },
          requires_visual: { type: "boolean" }
        }
      }
    }
  }
} as const;

const commonPrompt = `Return every visible exam question in original order, including all subparts.
- Transcribe each question faithfully using Markdown with $...$ for inline LaTeX and $$...$$ for display LaTeX.
- Copy the printed mark allocation when visible; otherwise use null.
- Record every one-based PDF page number containing the question.
- Set requires_visual to true when a graph, diagram, table, map, image, or other visual is needed to understand or answer the question.
- Set review_warning when any text or visual is uncertain, illegible, cropped, or cannot be represented adequately. Otherwise use null.
- Do not invent missing values or include front-matter instructions.
- Treat related subparts as one entry when they share a question number.`;

export function processingPrompt(mode: Extract<ExamIntakeMode, "ai_solved" | "teacher_html">) {
  if (mode === "teacher_html") {
    return `You are transcribing an uploaded exam paper for a teacher-provided answer workflow.

${commonPrompt}

You must not solve, answer, hint at, or explain any question. Set answer_text to null for every question.`;
  }
  return `You are preparing a reviewed tuition exam solution from an uploaded PDF.

${commonPrompt}

For every question, produce a complete worked answer suitable for students. Show reasoning and finish with a clear final answer. answer_text must never be null.`;
}

type OpenAIResponse = {
  id?: string;
  status?: string;
  error?: { message?: string } | null;
  incomplete_details?: { reason?: string } | null;
  output_text?: string;
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
};

function responseText(response: OpenAIResponse) {
  if (response.output_text) return response.output_text;
  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("");
}

function responseFailureMessage(response: OpenAIResponse) {
  return response.error?.message ?? response.incomplete_details?.reason ?? `OpenAI processing ended with status ${response.status ?? "unknown"}.`;
}

function responseUsage(response: OpenAIResponse): AIUsageTokenCounts {
  const inputTokens = response.usage?.input_tokens ?? null;
  const outputTokens = response.usage?.output_tokens ?? null;
  return {
    inputTokens,
    outputTokens,
    totalTokens: response.usage?.total_tokens ?? (inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null)
  };
}

async function openAIRequest(path: string, init?: RequestInit) {
  const { apiKey } = getOpenAIEnv();
  const response = await fetch(`https://api.openai.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store"
  });
  const body = (await response.json()) as OpenAIResponse;
  if (!response.ok) throw new Error(responseFailureMessage(body));
  return body;
}

async function failRun(
  runId: string,
  examId: string,
  organizationId: string,
  message: string,
  options: AIUsageTokenCounts & { model?: string | null; responseId?: string | null } = {}
) {
  const supabase = createAdminClient();
  const completedAt = new Date().toISOString();
  await Promise.all([
    supabase
      .from("exam_processing_runs")
      .update({ status: "failed", error: message, completed_at: completedAt })
      .eq("organization_id", organizationId)
      .eq("id", runId),
    supabase
      .from("exams")
      .update({ processing_status: "failed", ai_error: message, processing_completed_at: completedAt })
      .eq("organization_id", organizationId)
      .eq("id", examId)
  ]);
  await logAIUsageEvent({
    organizationId,
    examId,
    runId,
    model: options.model,
    requestType: "exam_processing",
    status: "failed",
    responseId: options.responseId,
    error: message,
    inputTokens: options.inputTokens,
    outputTokens: options.outputTokens,
    totalTokens: options.totalTokens
  });
  return { status: "failed" as ExamProcessingStatus, error: message };
}

export async function startExamProcessing(examId: string, actorId: string) {
  const supabase = createAdminClient();
  const organizationId = await getCurrentOrganizationId();
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", examId)
    .single();
  if (examError || !exam) throw new Error("Exam not found.");
  if (exam.intake_mode === "handwritten_images") throw new Error("Handwritten exams do not use AI processing.");
  if (exam.status === "published" || exam.status === "archived") throw new Error("This exam cannot be reprocessed.");
  if (exam.processing_status === "processing") throw new Error("This exam is already processing.");

  const { data: sourceAsset } = await supabase
    .from("exam_assets")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("exam_id", examId)
    .eq("role", "source_pdf")
    .eq("variant", "raw")
    .eq("upload_status", "ready")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sourceAsset) throw new Error("Upload and verify the source PDF before processing.");

  if (exam.intake_mode === "teacher_html") {
    const { data: htmlAsset } = await supabase
      .from("exam_assets")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("exam_id", examId)
      .eq("role", "answer_html")
      .eq("variant", "raw")
      .eq("upload_status", "ready")
      .maybeSingle();
    if (!htmlAsset) throw new Error("Upload and verify the teacher answer HTML before processing.");
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from(sourceAsset.storage_bucket)
    .createSignedUrl(sourceAsset.storage_key, 60 * 60);
  if (signedError || !signedData?.signedUrl) throw new Error(signedError?.message ?? "Could not prepare the source PDF.");

  const { model } = getOpenAIEnv();
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const { error: runError } = await supabase.from("exam_processing_runs").insert({
    organization_id: organizationId,
    id: runId,
    exam_id: examId,
    mode: exam.intake_mode,
    status: "processing",
    model,
    started_by: actorId,
    started_at: startedAt
  });
  if (runError) throw new Error(runError.message);

  try {
    const response = await openAIRequest("/responses", {
      method: "POST",
      body: JSON.stringify({
        model,
        background: true,
        store: true,
        reasoning: { effort: "medium" },
        input: [
          {
            role: "user",
            content: [
              { type: "input_file", file_url: signedData.signedUrl },
              { type: "input_text", text: processingPrompt(exam.intake_mode) }
            ]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: exam.intake_mode === "teacher_html" ? "exam_question_transcription" : "exam_questions_and_answers",
            strict: true,
            schema: structuredOutputSchema
          }
        }
      })
    });
    if (!response.id) throw new Error("OpenAI did not return a processing identifier.");

    const { error: updateRunError } = await supabase
      .from("exam_processing_runs")
      .update({ response_id: response.id })
      .eq("organization_id", organizationId)
      .eq("id", runId);
    if (updateRunError) throw new Error(updateRunError.message);
    const { error: updateExamError } = await supabase
      .from("exams")
      .update({
        processing_status: "processing",
        ai_model: model,
        ai_response_id: response.id,
        ai_error: null,
        processing_started_at: startedAt,
        processing_completed_at: null
      })
      .eq("organization_id", organizationId)
      .eq("id", examId);
    if (updateExamError) throw new Error(updateExamError.message);

    await logAIUsageEvent({
      organizationId,
      examId,
      runId,
      model,
      requestType: "exam_processing",
      status: "started",
      responseId: response.id,
      metadata: { mode: exam.intake_mode }
    });

    await logAudit({
      organizationId,
      actorId,
      action: "exam_processing_started",
      resourceType: "exam",
      resourceId: examId,
      afterData: { run_id: runId, mode: exam.intake_mode, model, response_id: response.id }
    });
    return { status: "processing" as ExamProcessingStatus };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start AI processing.";
    await failRun(runId, examId, organizationId, message, { model });
    throw error;
  }
}

async function loadTeacherHtml(examId: string, organizationId: string) {
  const supabase = createAdminClient();
  const { data: htmlAsset } = await supabase
    .from("exam_assets")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("exam_id", examId)
    .eq("role", "answer_html")
    .eq("variant", "raw")
    .eq("upload_status", "ready")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (!htmlAsset) throw new Error("Teacher answer HTML was not found.");

  const [{ data: signed }, { data: imageAssets }] = await Promise.all([
    supabase.storage.from(htmlAsset.storage_bucket).createSignedUrl(htmlAsset.storage_key, 60),
    supabase
      .from("exam_assets")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("exam_id", examId)
      .eq("role", "html_image")
      .eq("variant", "display")
      .eq("upload_status", "ready")
  ]);
  if (!signed?.signedUrl) throw new Error("Could not read the teacher answer HTML.");
  const response = await fetch(signed.signedUrl, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not read the teacher answer HTML.");
  return importTeacherHtmlAnswers(await response.text(), examId, imageAssets ?? []);
}

export async function finalizeExamProcessing(responseId: string, actorId?: string | null) {
  const supabase = createAdminClient();
  const { data: run, error: runError } = await supabase
    .from("exam_processing_runs")
    .select("*")
    .eq("response_id", responseId)
    .single();
  if (runError || !run) throw new Error("Exam processing run was not found.");
  if (run.status === "completed") return { status: "completed" as ExamProcessingStatus, error: null };
  if (run.status === "failed") return { status: "failed" as ExamProcessingStatus, error: run.error };

  const response = await openAIRequest(`/responses/${encodeURIComponent(responseId)}`);
  if (response.status === "queued" || response.status === "in_progress") {
    return { status: "processing" as ExamProcessingStatus, error: null };
  }
  if (response.status !== "completed") {
    return failRun(run.id, run.exam_id, run.organization_id, responseFailureMessage(response), {
      model: run.model,
      responseId,
      ...responseUsage(response)
    });
  }

  let generated;
  try {
    generated = generatedExamSchema.parse(JSON.parse(responseText(response)));
    if (run.mode === "ai_solved" && generated.questions.some((question) => !question.answer_text?.trim())) {
      throw new Error("AI-solved output omitted an answer.");
    }
    if (run.mode === "teacher_html" && generated.questions.some((question) => question.answer_text !== null)) {
      throw new Error("Transcription-only output unexpectedly contained an answer.");
    }
    const questionNumbers = generated.questions.map((question) => question.question_number);
    if (new Set(questionNumbers).size !== questionNumbers.length) {
      throw new Error("AI output contained duplicate question numbers.");
    }
  } catch (error) {
    return failRun(
      run.id,
      run.exam_id,
      run.organization_id,
      error instanceof Error ? error.message : "The AI response did not contain valid exam data.",
      { model: run.model, responseId, ...responseUsage(response) }
    );
  }

  try {
    let questions = generated.questions.map((question, index) => ({
      id: crypto.randomUUID(),
      exam_id: run.exam_id,
      question_number: question.question_number,
      question_text: question.question_text,
      answer_text: run.mode === "ai_solved" ? question.answer_text : null,
      question_html: null,
      answer_html: null as string | null,
      question_format: "markdown",
      answer_format: run.mode === "teacher_html" ? "html" : "markdown",
      marks: question.marks,
      source_pages: question.source_pages,
      review_warning: question.review_warning,
      requires_visual: question.requires_visual,
      visual_not_needed: false,
      sort_order: index + 1
    }));

    if (run.mode === "teacher_html") {
      questions = mapTeacherAnswers(questions, await loadTeacherHtml(run.exam_id, run.organization_id));
    }

    const { data: didComplete, error: completionError } = await supabase.rpc("complete_exam_processing_run", {
      p_run_id: run.id,
      p_questions: questions
    });
    if (completionError) throw new Error(completionError.message);

    if (didComplete) {
      await logAIUsageEvent({
        organizationId: run.organization_id,
        examId: run.exam_id,
        runId: run.id,
        model: run.model,
        requestType: "exam_processing",
        status: "completed",
        responseId,
        ...responseUsage(response),
        metadata: { mode: run.mode, question_count: questions.length }
      });
      await logAudit({
        organizationId: run.organization_id,
        actorId: actorId ?? run.started_by,
        action: "exam_processing_completed",
        resourceType: "exam",
        resourceId: run.exam_id,
        afterData: { run_id: run.id, mode: run.mode, question_count: questions.length }
      });
    }
    return { status: "completed" as ExamProcessingStatus, error: null, questionCount: questions.length };
  } catch (error) {
    return failRun(
      run.id,
      run.exam_id,
      run.organization_id,
      error instanceof Error ? error.message : "Could not save processed questions.",
      { model: run.model, responseId, ...responseUsage(response) }
    );
  }
}

export async function syncExamProcessing(examId: string, actorId: string) {
  const supabase = createAdminClient();
  const organizationId = await getCurrentOrganizationId();
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", examId)
    .single();
  if (examError || !exam) throw new Error("Exam not found.");
  if (exam.processing_status !== "processing") {
    return { status: exam.processing_status as ExamProcessingStatus, error: exam.ai_error as string | null };
  }
  const { data: run } = await supabase
    .from("exam_processing_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("exam_id", examId)
    .eq("status", "processing")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!run?.response_id) throw new Error("The active processing run has no OpenAI response identifier.");
  return finalizeExamProcessing(run.response_id, actorId);
}
