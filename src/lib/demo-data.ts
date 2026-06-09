import type { AppData } from "@/types/domain";

const now = "2026-05-17T00:00:00.000Z";

export const demoIds = {
  student: "00000000-0000-4000-8000-000000000001",
  admin: "00000000-0000-4000-8000-000000000002",
  otherStudent: "00000000-0000-4000-8000-000000000003",
  group: "10000000-0000-4000-8000-000000000001",
  year: "20000000-0000-4000-8000-000000000001",
  subject: "30000000-0000-4000-8000-000000000001",
  chapter: "40000000-0000-4000-8000-000000000001",
  question: "50000000-0000-4000-8000-000000000001",
  recording: "60000000-0000-4000-8000-000000000001",
  material: "70000000-0000-4000-8000-000000000001",
  exam: "72000000-0000-4000-8000-000000000001"
} as const;

export const demoData: AppData = {
  profiles: [
    {
      id: demoIds.student,
      email: "student@example.com",
      full_name: "Demo Student",
      is_active: true,
      must_change_password: false,
      created_at: now,
      updated_at: now
    },
    {
      id: demoIds.admin,
      email: "admin@example.com",
      full_name: "Demo Admin",
      is_active: true,
      must_change_password: false,
      created_at: now,
      updated_at: now
    },
    {
      id: demoIds.otherStudent,
      email: "locked@example.com",
      full_name: "No Access Student",
      is_active: true,
      must_change_password: false,
      created_at: now,
      updated_at: now
    }
  ],
  userRoles: [
    { user_id: demoIds.student, role: "student" },
    { user_id: demoIds.admin, role: "super_admin" },
    { user_id: demoIds.otherStudent, role: "student" }
  ],
  studentProfiles: [
    {
      user_id: demoIds.student,
      guardian_name: "Demo Guardian",
      phone: "+60120000000",
      notes: "Seeded local demo student.",
      created_at: now,
      updated_at: now
    },
    {
      user_id: demoIds.otherStudent,
      guardian_name: null,
      phone: null,
      notes: "Used for denied access tests.",
      created_at: now,
      updated_at: now
    }
  ],
  groups: [
    {
      id: demoIds.group,
      name: "Year 7 Maths Alpha",
      description: "Local demo access group.",
      is_active: true,
      created_at: now,
      updated_at: now
    }
  ],
  memberships: [
    {
      id: "11000000-0000-4000-8000-000000000001",
      student_id: demoIds.student,
      group_id: demoIds.group,
      status: "active",
      starts_at: "2026-01-01T00:00:00.000Z",
      expires_at: null,
      created_at: now
    }
  ],
  years: [
    {
      id: demoIds.year,
      name: "Year 7",
      description: "Lower secondary foundation year.",
      sort_order: 1,
      status: "published",
      is_ai_indexable: true,
      created_at: now,
      updated_at: now
    }
  ],
  subjects: [
    {
      id: demoIds.subject,
      year_id: demoIds.year,
      name: "Mathematics",
      description: "Core mathematics lessons and worked examples.",
      sort_order: 1,
      status: "published",
      is_ai_indexable: true,
      created_at: now,
      updated_at: now
    }
  ],
  chapters: [
    {
      id: demoIds.chapter,
      subject_id: demoIds.subject,
      title: "Linear Equations",
      description: "Solving one-variable equations step by step.",
      sort_order: 1,
      status: "published",
      is_ai_indexable: true,
      created_at: now,
      updated_at: now
    }
  ],
  questions: [
    {
      id: demoIds.question,
      chapter_id: demoIds.chapter,
      title: "Balancing Equations",
      question_text: "Solve 2x + 5 = 17.",
      description: "Worked algebra question.",
      sort_order: 1,
      status: "published",
      is_ai_indexable: true,
      created_at: now,
      updated_at: now
    }
  ],
  recordings: [
    {
      id: demoIds.recording,
      chapter_id: demoIds.chapter,
      question_id: demoIds.question,
      title: "Solving 2x + 5 = 17",
      description: "Teacher walkthrough for balancing equations.",
      youtube_video_id: "dQw4w9WgXcQ",
      duration_seconds: 420,
      recorded_at: now,
      transcript_text: "Move 5 to the other side, then divide by 2.",
      transcript_source: "manual",
      transcript_review_status: "approved",
      status: "published",
      is_ai_indexable: true,
      created_by: demoIds.admin,
      created_at: now,
      updated_at: now
    }
  ],
  solutionMaterials: [
    {
      id: demoIds.material,
      chapter_id: demoIds.chapter,
      question_id: demoIds.question,
      title: "Linear Equations Solution Sheet",
      description: "PDF solution notes for the demo question.",
      storage_bucket: "solution-materials",
      file_key: "demo/linear-equations-solution.pdf",
      file_name: "linear-equations-solution.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 24576,
      is_downloadable: true,
      status: "published",
      is_ai_indexable: true,
      uploaded_by: demoIds.admin,
      created_at: now,
      updated_at: now
    }
  ],
  exams: [
    {
      id: demoIds.exam,
      subject_id: demoIds.subject,
      title: "Linear Equations Practice Exam",
      description: "Reviewed questions and worked answers.",
      source_bucket: "exam-sources",
      source_key: "demo/linear-equations-exam.pdf",
      source_file_name: "linear-equations-exam.pdf",
      source_mime_type: "application/pdf",
      source_size_bytes: 32768,
      status: "published",
      ai_model: "gpt-5.4-mini",
      ai_response_id: null,
      ai_error: null,
      processing_started_at: now,
      processing_completed_at: now,
      uploaded_by: demoIds.admin,
      approved_by: demoIds.admin,
      approved_at: now,
      published_at: now,
      created_at: now,
      updated_at: now
    }
  ],
  examChapters: [
    {
      exam_id: demoIds.exam,
      chapter_id: demoIds.chapter,
      created_at: now
    }
  ],
  examQuestions: [
    {
      id: "73000000-0000-4000-8000-000000000001",
      exam_id: demoIds.exam,
      question_number: "1",
      question_text: "Solve $2x + 5 = 17$.",
      answer_text: "Subtract 5 from both sides:\n\n$2x = 12$\n\nDivide by 2:\n\n$\\boxed{x = 6}$",
      marks: 2,
      source_pages: [1],
      review_warning: null,
      sort_order: 1,
      created_at: now,
      updated_at: now
    },
    {
      id: "73000000-0000-4000-8000-000000000002",
      exam_id: demoIds.exam,
      question_number: "2",
      question_text: "Solve $3(x - 2) = 15$.",
      answer_text: "Divide by 3:\n\n$x - 2 = 5$\n\nAdd 2:\n\n$\\boxed{x = 7}$",
      marks: 2,
      source_pages: [1],
      review_warning: null,
      sort_order: 2,
      created_at: now,
      updated_at: now
    }
  ],
  accessGrants: [
    {
      id: "80000000-0000-4000-8000-000000000001",
      grantee_type: "group",
      grantee_id: demoIds.group,
      resource_type: "year",
      resource_id: demoIds.year,
      permission: "download",
      starts_at: "2026-01-01T00:00:00.000Z",
      expires_at: null,
      granted_by: demoIds.admin,
      revoked_at: null,
      revoked_by: null,
      created_at: now
    }
  ],
  tags: [
    {
      id: "90000000-0000-4000-8000-000000000001",
      name: "Algebra",
      slug: "algebra",
      created_at: now
    }
  ],
  contentTags: [
    {
      id: "91000000-0000-4000-8000-000000000001",
      tag_id: "90000000-0000-4000-8000-000000000001",
      resource_type: "chapter",
      resource_id: demoIds.chapter
    }
  ],
  auditLogs: [
    {
      id: "a0000000-0000-4000-8000-000000000001",
      actor_id: demoIds.admin,
      action: "access_granted",
      resource_type: "year",
      resource_id: demoIds.year,
      before_data: null,
      after_data: { grantee_type: "group", permission: "download" },
      created_at: now
    }
  ],
  activityEvents: []
};

export function cloneDemoData(): AppData {
  return structuredClone(demoData);
}
