export type RoleName = "student" | "teacher" | "admin" | "super_admin";

export type ContentStatus = "draft" | "published" | "archived";

export type ResourceType =
  | "year"
  | "subject"
  | "chapter"
  | "question"
  | "recording"
  | "solution_material";

export type PermissionLevel = "view" | "download";

export type GranteeType = "user" | "group";

export type TranscriptSource = "none" | "manual" | "youtube" | "generated";

export type TranscriptReviewStatus = "draft" | "reviewed" | "approved";

export type ExamStatus = "uploading" | "uploaded" | "processing" | "ready" | "failed" | "published" | "archived";

export type ActivityEventType =
  | "login"
  | "recording_viewed"
  | "solution_material_opened"
  | "solution_material_downloaded"
  | "exam_viewed"
  | "search_performed";

export type AuditAction =
  | "user_created"
  | "user_updated"
  | "user_deactivated"
  | "role_changed"
  | "group_created"
  | "group_updated"
  | "student_added_to_group"
  | "student_removed_from_group"
  | "access_granted"
  | "access_revoked"
  | "content_created"
  | "content_updated"
  | "content_published"
  | "content_unpublished"
  | "recording_created"
  | "recording_updated"
  | "material_uploaded"
  | "material_archived"
  | "exam_uploaded"
  | "exam_processing_started"
  | "exam_processing_completed"
  | "exam_updated"
  | "exam_published";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
};

export type UserRole = {
  user_id: string;
  role: RoleName;
};

export type StudentProfile = {
  user_id: string;
  guardian_name: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentGroup = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type StudentGroupMembership = {
  id: string;
  student_id: string;
  group_id: string;
  status: "active" | "inactive";
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type Year = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  status: ContentStatus;
  is_ai_indexable: boolean;
  created_at: string;
  updated_at: string;
};

export type Subject = {
  id: string;
  year_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  status: ContentStatus;
  is_ai_indexable: boolean;
  created_at: string;
  updated_at: string;
};

export type Chapter = {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  status: ContentStatus;
  is_ai_indexable: boolean;
  created_at: string;
  updated_at: string;
};

export type Question = {
  id: string;
  chapter_id: string;
  title: string;
  question_text: string;
  description: string | null;
  sort_order: number;
  status: ContentStatus;
  is_ai_indexable: boolean;
  created_at: string;
  updated_at: string;
};

export type Recording = {
  id: string;
  chapter_id: string;
  question_id: string | null;
  title: string;
  description: string | null;
  youtube_video_id: string;
  duration_seconds: number | null;
  recorded_at: string | null;
  transcript_text: string | null;
  transcript_source: TranscriptSource;
  transcript_review_status: TranscriptReviewStatus;
  status: ContentStatus;
  is_ai_indexable: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SolutionMaterial = {
  id: string;
  chapter_id: string;
  question_id: string | null;
  title: string;
  description: string | null;
  storage_bucket: string;
  file_key: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  is_downloadable: boolean;
  status: ContentStatus;
  is_ai_indexable: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Exam = {
  id: string;
  chapter_id: string;
  title: string;
  description: string | null;
  source_bucket: string;
  source_key: string;
  source_file_name: string;
  source_mime_type: string;
  source_size_bytes: number;
  status: ExamStatus;
  ai_model: string | null;
  ai_response_id: string | null;
  ai_error: string | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  uploaded_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ExamQuestion = {
  id: string;
  exam_id: string;
  question_number: string;
  question_text: string;
  answer_text: string;
  marks: number | null;
  source_pages: number[];
  review_warning: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type AccessGrant = {
  id: string;
  grantee_type: GranteeType;
  grantee_id: string;
  resource_type: ResourceType;
  resource_id: string;
  permission: PermissionLevel;
  starts_at: string | null;
  expires_at: string | null;
  granted_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  created_at: string;
};

export type Tag = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type ContentTag = {
  id: string;
  tag_id: string;
  resource_type: Extract<ResourceType, "chapter" | "question" | "recording" | "solution_material">;
  resource_id: string;
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  action: AuditAction;
  resource_type: string;
  resource_id: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
};

export type ActivityEvent = {
  id: string;
  user_id: string;
  event_type: ActivityEventType;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AppData = {
  profiles: Profile[];
  userRoles: UserRole[];
  studentProfiles: StudentProfile[];
  groups: ContentGroup[];
  memberships: StudentGroupMembership[];
  years: Year[];
  subjects: Subject[];
  chapters: Chapter[];
  questions: Question[];
  recordings: Recording[];
  solutionMaterials: SolutionMaterial[];
  exams: Exam[];
  examQuestions: ExamQuestion[];
  accessGrants: AccessGrant[];
  tags: Tag[];
  contentTags: ContentTag[];
  auditLogs: AuditLog[];
  activityEvents: ActivityEvent[];
};

export type AccessibleContentTree = {
  years: Array<
    Year & {
      subjects: Array<
        Subject & {
          chapters: Array<
            Chapter & {
              questions: Question[];
              recordings: Recording[];
              materials: SolutionMaterial[];
            }
          >;
        }
      >;
    }
  >;
};

export type SearchResult = {
  type: Extract<ResourceType, "chapter" | "question" | "recording" | "solution_material">;
  id: string;
  title: string;
  description: string | null;
  href: string;
  context: string;
};
