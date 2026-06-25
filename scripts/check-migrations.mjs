import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const migrationDir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(migrationDir).filter((file) => file.endsWith(".sql")).sort();

if (files.length === 0) {
  throw new Error("No migration files found.");
}

const sql = files.map((file) => readFileSync(join(migrationDir, file), "utf8")).join("\n");
const requiredTables = [
  "organizations",
  "organization_memberships",
  "profiles",
  "roles",
  "user_roles",
  "student_profiles",
  "content_groups",
  "student_group_memberships",
  "years",
  "subjects",
  "chapters",
  "questions",
  "recordings",
  "solution_materials",
  "exams",
  "exam_chapters",
  "exam_questions",
  "exam_assets",
  "exam_processing_runs",
  "access_grants",
  "tags",
  "content_tags",
  "audit_logs",
  "activity_events"
];

const missing = requiredTables.filter((table) => !sql.includes(`public.${table}`));

if (missing.length > 0) {
  throw new Error(`Migration missing required tables: ${missing.join(", ")}`);
}

console.log(`Checked ${files.length} migration file(s). Required MVP tables are present.`);
