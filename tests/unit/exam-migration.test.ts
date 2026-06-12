import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/0007_multi_mode_exam_upload.sql"),
  "utf8"
);

describe("multi-mode exam migration", () => {
  it("maps legacy lifecycle states without changing published exams", () => {
    expect(migration).toContain("when status = 'ready' then 'review'");
    expect(migration).toContain("when status = 'published' then 'published'");
    expect(migration).toContain("else 'draft'");
  });

  it("backfills sources and processing history and provides atomic review functions", () => {
    expect(migration).toContain("insert into public.exam_assets");
    expect(migration).toContain("insert into public.exam_processing_runs");
    expect(migration).toContain("create or replace function public.save_exam_review");
    expect(migration).toContain("create or replace function public.complete_exam_processing_run");
  });
});
