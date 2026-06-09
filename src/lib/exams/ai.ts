import "server-only";

import { z } from "zod";
import { logAudit } from "@/lib/audit/log";
import { getOpenAIEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ExamStatus } from "@/types/domain";

const generatedExamSchema = z.object({
  questions: z.array(
    z.object({
      question_number: z.string().min(1),
      question_text: z.string().min(1),
      answer_text: z.string().min(1),
      marks: z.number().int().min(0).nullable(),
      source_pages: z.array(z.number().int().positive()),
      review_warning: z.string().nullable()
    })
  ).min(1)
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
        required: ["question_number", "question_text", "answer_text", "marks", "source_pages", "review_warning"],
        properties: {
          question_number: { type: "string" },
          question_text: { type: "string" },
          answer_text: { type: "string" },
          marks: { anyOf: [{ type: "integer", minimum: 0 }, { type: "null" }] },
          source_pages: {
            type: "array",
            items: { type: "integer", minimum: 1 }
          },
          review_warning: { anyOf: [{ type: "string" }, { type: "null" }] }
        }
      }
    }
  }
} as const;

const processingPrompt = `You are preparing a reviewed tuition exam solution from an uploaded PDF.

Return every visible exam question in original order, including all subparts. For each item:
- Transcribe the question faithfully. Preserve mathematical notation using Markdown and LaTeX delimiters.
- Produce a complete worked answer suitable for students. Show reasoning and finish with a clear final answer.
- Copy the printed mark allocation when visible; otherwise use null.
- Record every one-based PDF page number containing the question.
- Set review_warning when any text, diagram, graph, table, or symbol is uncertain, illegible, cropped, or cannot be represented adequately in text. Otherwise use null.

Do not invent missing values. Do not include front-matter instructions unless they are part of a question. Treat related subparts as one question entry when they share a question number.`;

type OpenAIResponse = {
  id?: string;
  status?: string;
  error?: { message?: string } | null;
  incomplete_details?: { reason?: string } | null;
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
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

async function openAIRequest(path: string, init?: RequestInit) {
  const { apiKey } = getOpenAIEnv();
  const response = await fetch(`https://api.openai.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init?.headers
    },
    cache: "no-store"
  });

  const body = (await response.json()) as OpenAIResponse;
  if (!response.ok) {
    throw new Error(responseFailureMessage(body));
  }
  return body;
}

export async function startExamProcessing(examId: string, actorId: string) {
  const supabase = createAdminClient();
  const { data: exam, error: examError } = await supabase.from("exams").select("*").eq("id", examId).single();
  if (examError || !exam) throw new Error("Exam not found.");
  if (!["uploaded", "failed", "ready"].includes(exam.status)) {
    throw new Error("This exam cannot be processed in its current state.");
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from(exam.source_bucket)
    .createSignedUrl(exam.source_key, 60 * 60);
  if (signedError || !signedData?.signedUrl) {
    throw new Error(signedError?.message ?? "Could not prepare the source PDF.");
  }

  const { model } = getOpenAIEnv();
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
            { type: "input_text", text: processingPrompt }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "exam_questions_and_answers",
          strict: true,
          schema: structuredOutputSchema
        }
      }
    })
  });

  if (!response.id) throw new Error("OpenAI did not return a processing identifier.");

  const startedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("exams")
    .update({
      status: "processing",
      ai_model: model,
      ai_response_id: response.id,
      ai_error: null,
      processing_started_at: startedAt,
      processing_completed_at: null
    })
    .eq("id", examId);
  if (updateError) throw new Error(updateError.message);

  await logAudit({
    actorId,
    action: "exam_processing_started",
    resourceType: "exam",
    resourceId: examId,
    afterData: { model, response_id: response.id }
  });

  return { status: "processing" as ExamStatus };
}

export async function syncExamProcessing(examId: string, actorId: string) {
  const supabase = createAdminClient();
  const { data: exam, error: examError } = await supabase.from("exams").select("*").eq("id", examId).single();
  if (examError || !exam) throw new Error("Exam not found.");
  if (exam.status !== "processing" || !exam.ai_response_id) {
    return { status: exam.status as ExamStatus, error: exam.ai_error as string | null };
  }

  const response = await openAIRequest(`/responses/${encodeURIComponent(exam.ai_response_id)}`);
  if (response.status === "queued" || response.status === "in_progress") {
    return { status: "processing" as ExamStatus, error: null };
  }

  if (response.status !== "completed") {
    const message = responseFailureMessage(response);
    await supabase
      .from("exams")
      .update({ status: "failed", ai_error: message, processing_completed_at: new Date().toISOString() })
      .eq("id", examId);
    return { status: "failed" as ExamStatus, error: message };
  }

  let generated;
  try {
    generated = generatedExamSchema.parse(JSON.parse(responseText(response)));
  } catch {
    const message = "The AI response was completed but did not contain valid exam data.";
    await supabase
      .from("exams")
      .update({ status: "failed", ai_error: message, processing_completed_at: new Date().toISOString() })
      .eq("id", examId);
    return { status: "failed" as ExamStatus, error: message };
  }

  const questions = generated.questions.map((question, index) => ({
    exam_id: examId,
    question_number: question.question_number,
    question_text: question.question_text,
    answer_text: question.answer_text,
    marks: question.marks,
    source_pages: question.source_pages,
    review_warning: question.review_warning,
    sort_order: index + 1
  }));

  const { data: existingQuestions, error: existingError } = await supabase
    .from("exam_questions")
    .select("id")
    .eq("exam_id", examId);
  if (existingError) throw new Error(existingError.message);
  const { error: insertError } = await supabase.from("exam_questions").insert(questions);
  if (insertError) throw new Error(insertError.message);
  const existingIds = (existingQuestions ?? []).map((question) => question.id);
  if (existingIds.length > 0) {
    const { error: deleteError } = await supabase.from("exam_questions").delete().in("id", existingIds);
    if (deleteError) throw new Error(deleteError.message);
  }

  const completedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("exams")
    .update({ status: "ready", ai_error: null, processing_completed_at: completedAt })
    .eq("id", examId);
  if (updateError) throw new Error(updateError.message);

  await logAudit({
    actorId,
    action: "exam_processing_completed",
    resourceType: "exam",
    resourceId: examId,
    afterData: { question_count: questions.length }
  });

  return { status: "ready" as ExamStatus, error: null, questionCount: questions.length };
}
