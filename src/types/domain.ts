export type RoleName = "student" | "teacher" | "admin" | "super_admin";

export type ContentStatus = "draft" | "published" | "archived";

export type ResourceType =
  | "year"
  | "subject"
  | "chapter"
  | "question"
  | "recording"
  | "solution_material"
  | "exam";

export type PermissionLevel = "view" | "download";

export type GranteeType = "user" | "group";

export type TranscriptSource = "none" | "manual" | "youtube" | "generated";

export type TranscriptReviewStatus = "draft" | "reviewed" | "approved";

export type ExamStatus = "draft" | "review" | "published" | "archived";
export type ExamProcessingStatus = "idle" | "processing" | "completed" | "failed";
export type ExamIntakeMode = "ai_solved" | "teacher_html" | "handwritten_images";
export type ExamContentFormat = "markdown" | "html" | "image";
export type ExamAssetPlacement = "before_content" | "after_content" | "inline";
export type ExamAssetRole =
  | "source_pdf"
  | "answer_html"
  | "html_image"
  | "question_image"
  | "answer_image"
  | "question_visual"
  | "answer_visual";

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
  | "exam_asset_uploaded"
  | "exam_updated"
  | "exam_published"
  | "exam_archived";

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
  subject_id: string;
  title: string;
  description: string | null;
  source_bucket: string | null;
  source_key: string | null;
  source_file_name: string | null;
  source_mime_type: string | null;
  source_size_bytes: number | null;
  status: ExamStatus;
  intake_mode: ExamIntakeMode;
  processing_status: ExamProcessingStatus;
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

export type ExamChapter = {
  exam_id: string;
  chapter_id: string;
  created_at: string;
};

export type ExamQuestion = {
  id: string;
  exam_id: string;
  question_number: string;
  question_text: string | null;
  answer_text: string | null;
  question_html: string | null;
  answer_html: string | null;
  question_format: ExamContentFormat;
  answer_format: ExamContentFormat;
  marks: number | null;
  source_pages: number[];
  review_warning: string | null;
  requires_visual: boolean;
  visual_not_needed: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ExamAsset = {
  id: string;
  exam_id: string;
  question_id: string | null;
  role: ExamAssetRole;
  variant: "raw" | "display";
  original_asset_id: string | null;
  storage_bucket: string;
  storage_key: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  upload_status: "pending" | "ready" | "failed";
  sort_order: number;
  placement: ExamAssetPlacement;
  source_page: number | null;
  crop_x: number | null;
  crop_y: number | null;
  crop_width: number | null;
  crop_height: number | null;
  width: number | null;
  height: number | null;
  rotation: 0 | 90 | 180 | 270;
  alt_text: string | null;
  student_visible: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ExamProcessingRun = {
  id: string;
  exam_id: string;
  mode: Extract<ExamIntakeMode, "ai_solved" | "teacher_html">;
  status: "processing" | "completed" | "failed";
  model: string;
  response_id: string | null;
  error: string | null;
  started_by: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
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
  resource_type: Extract<ResourceType, "chapter" | "question" | "recording" | "solution_material" | "exam">;
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
  examChapters: ExamChapter[];
  examQuestions: ExamQuestion[];
  examAssets: ExamAsset[];
  examProcessingRuns: ExamProcessingRun[];
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
  type: Extract<ResourceType, "chapter" | "question" | "recording" | "solution_material" | "exam">;
  id: string;
  title: string;
  description: string | null;
  href: string;
  context: string;
};
