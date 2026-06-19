"use client";

import { useMemo, useState } from "react";
import { IconBook2, IconChevronRight, IconHelpCircle, IconStack2, IconListTree, IconArchive } from "@tabler/icons-react";
import { AdminDialog, CheckField, CreateButton, EditButton, EmptyTable, Field, StatusBadge, statusOptions } from "@/components/admin/admin-ui";
import { MarkdownLatexEditor } from "@/components/content/markdown-latex-editor";
import { PageHeading } from "@/components/layout/page-heading";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  archiveContentAction,
  createChapterAction,
  createQuestionAction,
  createSubjectAction,
  createYearAction,
  updateContentAction
} from "@/features/admin/actions";
import { cn } from "@/lib/utils";
import type { AppData, Chapter, Question, Subject, Year } from "@/types/domain";

type ContentTreeRow =
  | {
      kind: "year";
      item: Year;
      level: 0;
      context: string;
      preview: string;
      ancestorIds: string[];
      toggleId: string;
      hasChildren: boolean;
    }
  | {
      kind: "subject";
      item: Subject;
      level: 1;
      context: string;
      preview: string;
      ancestorIds: string[];
      toggleId: string;
      hasChildren: boolean;
    }
  | {
      kind: "chapter";
      item: Chapter;
      level: 2;
      context: string;
      preview: string;
      ancestorIds: string[];
      toggleId: string;
      hasChildren: boolean;
    }
  | {
      kind: "question";
      item: Question;
      level: 3;
      context: string;
      preview: string;
      ancestorIds: string[];
      toggleId: string;
      hasChildren: false;
    };

const rowMeta = {
  year: { icon: IconStack2, label: "Year", tone: "bg-primary/10 text-primary ring-primary/15" },
  subject: { icon: IconBook2, label: "Subject", tone: "bg-secondary text-secondary-foreground ring-border" },
  chapter: { icon: IconListTree, label: "Chapter", tone: "bg-secondary text-secondary-foreground ring-border" },
  question: { icon: IconHelpCircle, label: "Question", tone: "bg-secondary text-secondary-foreground ring-border" }
} as const;

function childCountLabel(parts: Array<[number, string]>) {
  return parts
    .filter(([count]) => count > 0)
    .map(([count, label]) => `${count} ${label}${count === 1 ? "" : "s"}`)
    .join(" · ");
}

function buildContentRows(data: AppData): ContentTreeRow[] {
  return data.years.flatMap((year) => {
    const yearToggleId = `year-${year.id}`;
    const yearSubjects = data.subjects.filter((subject) => subject.year_id === year.id);
    const yearChapters = yearSubjects.flatMap((subject) => data.chapters.filter((chapter) => chapter.subject_id === subject.id));
    const yearQuestions = yearChapters.flatMap((chapter) => data.questions.filter((question) => question.chapter_id === chapter.id));
    const rows: ContentTreeRow[] = [
      {
        kind: "year",
        item: year,
        level: 0,
        context:
          childCountLabel([
            [yearSubjects.length, "subject"],
            [yearChapters.length, "chapter"],
            [yearQuestions.length, "question"]
          ]) || "No child content",
        preview: year.description ?? "No description",
        ancestorIds: [],
        toggleId: yearToggleId,
        hasChildren: yearSubjects.length > 0
      }
    ];

    for (const subject of yearSubjects) {
      const subjectToggleId = `subject-${subject.id}`;
      const subjectChapters = data.chapters.filter((chapter) => chapter.subject_id === subject.id);
      const subjectQuestions = subjectChapters.flatMap((chapter) => data.questions.filter((question) => question.chapter_id === chapter.id));
      rows.push({
        kind: "subject",
        item: subject,
        level: 1,
        context: `Under ${year.name} · ${
          childCountLabel([
            [subjectChapters.length, "chapter"],
            [subjectQuestions.length, "question"]
          ]) || "No child content"
        }`,
        preview: subject.description ?? "No description",
        ancestorIds: [yearToggleId],
        toggleId: subjectToggleId,
        hasChildren: subjectChapters.length > 0
      });

      for (const chapter of subjectChapters) {
        const chapterToggleId = `chapter-${chapter.id}`;
        const chapterQuestions = data.questions.filter((question) => question.chapter_id === chapter.id);
        rows.push({
          kind: "chapter",
          item: chapter,
          level: 2,
          context: `Under ${subject.name} · ${childCountLabel([[chapterQuestions.length, "question"]]) || "No questions"}`,
          preview: chapter.description ?? "No description",
          ancestorIds: [yearToggleId, subjectToggleId],
          toggleId: chapterToggleId,
          hasChildren: chapterQuestions.length > 0
        });

        for (const question of chapterQuestions) {
          rows.push({
            kind: "question",
            item: question,
            level: 3,
            context: `Under ${chapter.title}`,
            preview: question.question_text || question.description || "No question text",
            ancestorIds: [yearToggleId, subjectToggleId, chapterToggleId],
            toggleId: `question-${question.id}`,
            hasChildren: false
          });
        }
      }
    }

    return rows;
  });
}

function ArchiveDialog({ row }: { row: ContentTreeRow }) {
  const title = "name" in row.item ? row.item.name : row.item.title;
  const meta = rowMeta[row.kind];

  if (row.item.status === "archived") {
    return <span className="text-xs text-muted-foreground">Archived</span>;
  }

  return (
    <AdminDialog
      title={`Archive ${meta.label.toLowerCase()}`}
      description="This is a soft delete. Child statuses stay unchanged, but archived ancestors hide their descendants from students."
      trigger={
        <button type="button" className={buttonVariants({ variant: "destructive", size: "sm" })}>
          <IconArchive className="size-3.5" />
          Archive
        </button>
      }
    >
      <form action={archiveContentAction} className="grid gap-4" data-mutation-form>
        <input name="resource_type" type="hidden" value={row.kind} />
        <input name="resource_id" type="hidden" value={row.item.id} />
        <p className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-muted-foreground">
          Archive <span className="font-semibold text-foreground">{title}</span>? You can restore it later by editing its status.
        </p>
        <Button type="submit" variant="destructive">
          Archive {meta.label.toLowerCase()}
        </Button>
      </form>
    </AdminDialog>
  );
}

function ContentTreeRow({
  row,
  expanded,
  onToggle,
  editDialog
}: {
  row: ContentTreeRow;
  expanded: boolean;
  onToggle: (id: string) => void;
  editDialog: React.ReactNode;
}) {
  const meta = rowMeta[row.kind];
  const Icon = meta.icon;
  const title = "name" in row.item ? row.item.name : row.item.title;
  const canToggle = row.hasChildren;

  return (
    <TableRow className={cn(row.kind === "year" && "bg-muted/35 hover:bg-muted/55", row.item.status === "archived" && "opacity-70")}>
      <TableCell className="min-w-[420px] whitespace-normal py-3">
        <div className="flex items-start gap-3" style={{ paddingLeft: `${row.level * 30}px` }}>
          <button
            type="button"
            onClick={() => canToggle && onToggle(row.toggleId)}
            disabled={!canToggle}
            className={cn(
              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md ring-1 transition",
              meta.tone,
              canToggle && "cursor-pointer hover:scale-105",
              !canToggle && "cursor-default"
            )}
            aria-expanded={canToggle ? expanded : undefined}
          >
            {canToggle ? <IconChevronRight className={cn("size-4 transition-transform", expanded && "rotate-90")} /> : <Icon className="size-4" />}
          </button>
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => canToggle && onToggle(row.toggleId)}
              disabled={!canToggle}
              className={cn("mb-1 flex flex-wrap items-center gap-2 text-left", canToggle && "cursor-pointer hover:text-primary")}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{meta.label}</span>
              <span className="font-semibold text-foreground">{title}</span>
            </button>
            <p className="max-w-2xl text-xs leading-5 text-muted-foreground">{row.preview}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="min-w-[220px] whitespace-normal">
        <span className="text-sm text-foreground">{row.context}</span>
      </TableCell>
      <TableCell className="w-[88px] text-center tabular-nums">{row.item.sort_order}</TableCell>
      <TableCell className="w-[130px]">
        <StatusBadge status={row.item.status} />
      </TableCell>
      <TableCell className="w-[190px]">
        <div className="flex justify-end gap-2">
          {editDialog}
          <ArchiveDialog row={row} />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ContentHierarchyManager({ data }: { data: AppData }) {
  const contentRows = useMemo(() => buildContentRows(data), [data]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const visibleRows = contentRows.filter((row) => row.ancestorIds.every((id) => !collapsed.has(id)));

  const toggleRow = (id: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const editDialog = (row: ContentTreeRow) => {
    if (row.kind === "year") {
      const year = row.item;
      return (
        <AdminDialog title="Edit year" trigger={<EditButton />}>
          <form action={updateContentAction} className="grid gap-3" data-mutation-form>
            <input name="resource_type" type="hidden" value="year" />
            <input name="resource_id" type="hidden" value={year.id} />
            <Field label="Name"><Input name="name" defaultValue={year.name} required /></Field>
            <Field label="Description"><Input name="description" defaultValue={year.description ?? ""} /></Field>
            <Field label="Sort order"><Input name="sort_order" type="number" defaultValue={year.sort_order} /></Field>
            <Field label="Status"><Select name="status" defaultValue={year.status}>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</Select></Field>
            <CheckField name="is_ai_indexable" label="AI indexable" defaultChecked={year.is_ai_indexable} />
            <Button type="submit">Save changes</Button>
          </form>
        </AdminDialog>
      );
    }

    if (row.kind === "subject") {
      const subject = row.item;
      return (
        <AdminDialog title="Edit subject" trigger={<EditButton />}>
          <form action={updateContentAction} className="grid gap-3" data-mutation-form>
            <input name="resource_type" type="hidden" value="subject" />
            <input name="resource_id" type="hidden" value={subject.id} />
            <Field label="Year"><Select name="year_id" defaultValue={subject.year_id}>{data.years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</Select></Field>
            <Field label="Name"><Input name="name" defaultValue={subject.name} required /></Field>
            <Field label="Description"><Input name="description" defaultValue={subject.description ?? ""} /></Field>
            <Field label="Sort order"><Input name="sort_order" type="number" defaultValue={subject.sort_order} /></Field>
            <Field label="Status"><Select name="status" defaultValue={subject.status}>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</Select></Field>
            <CheckField name="is_ai_indexable" label="AI indexable" defaultChecked={subject.is_ai_indexable} />
            <Button type="submit">Save changes</Button>
          </form>
        </AdminDialog>
      );
    }

    if (row.kind === "chapter") {
      const chapter = row.item;
      return (
        <AdminDialog title="Edit chapter" trigger={<EditButton />}>
          <form action={updateContentAction} className="grid gap-3" data-mutation-form>
            <input name="resource_type" type="hidden" value="chapter" />
            <input name="resource_id" type="hidden" value={chapter.id} />
            <Field label="Subject"><Select name="subject_id" defaultValue={chapter.subject_id}>{data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</Select></Field>
            <Field label="Title"><Input name="title" defaultValue={chapter.title} required /></Field>
            <Field label="Description"><Input name="description" defaultValue={chapter.description ?? ""} /></Field>
            <Field label="Sort order"><Input name="sort_order" type="number" defaultValue={chapter.sort_order} /></Field>
            <Field label="Status"><Select name="status" defaultValue={chapter.status}>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</Select></Field>
            <CheckField name="is_ai_indexable" label="AI indexable" defaultChecked={chapter.is_ai_indexable} />
            <Button type="submit">Save changes</Button>
          </form>
        </AdminDialog>
      );
    }

    const question = row.item;
    return (
      <AdminDialog title="Edit question" trigger={<EditButton />}>
        <form action={updateContentAction} className="grid gap-3" data-mutation-form>
          <input name="resource_type" type="hidden" value="question" />
          <input name="resource_id" type="hidden" value={question.id} />
          <Field label="Chapter"><Select name="chapter_id" defaultValue={question.chapter_id}>{data.chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}</Select></Field>
          <Field label="Title"><Input name="title" defaultValue={question.title} required /></Field>
          <MarkdownLatexEditor label="Question text" name="question_text" defaultValue={question.question_text} required />
          <Field label="Description"><Input name="description" defaultValue={question.description ?? ""} /></Field>
          <Field label="Sort order"><Input name="sort_order" type="number" defaultValue={question.sort_order} /></Field>
          <Field label="Status"><Select name="status" defaultValue={question.status}>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</Select></Field>
          <CheckField name="is_ai_indexable" label="AI indexable" defaultChecked={question.is_ai_indexable} />
          <Button type="submit">Save changes</Button>
        </form>
      </AdminDialog>
    );
  };

  return (
    <>
      <PageHeading
        title="Syllabus content"
        description="Edit years, subjects, chapters, questions, publishing status, and AI-ready flags."
        actions={
          <div className="flex flex-wrap gap-2">
            <AdminDialog title="Create year" trigger={<CreateButton>Year</CreateButton>}>
              <form action={createYearAction} className="grid gap-3" data-mutation-form>
                <Field label="Name"><Input name="name" required /></Field>
                <Field label="Description"><Input name="description" /></Field>
                <Field label="Sort order"><Input name="sort_order" type="number" defaultValue={0} /></Field>
                <Field label="Status"><Select name="status" defaultValue="draft">{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</Select></Field>
                <CheckField name="is_ai_indexable" label="AI indexable" />
                <Button type="submit">Create year</Button>
              </form>
            </AdminDialog>
            <AdminDialog title="Create subject" trigger={<CreateButton>Subject</CreateButton>}>
              <form action={createSubjectAction} className="grid gap-3" data-mutation-form>
                <Field label="Year"><Select name="year_id">{data.years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</Select></Field>
                <Field label="Name"><Input name="name" required /></Field>
                <Field label="Description"><Input name="description" /></Field>
                <Field label="Sort order"><Input name="sort_order" type="number" defaultValue={0} /></Field>
                <Field label="Status"><Select name="status" defaultValue="draft">{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</Select></Field>
                <CheckField name="is_ai_indexable" label="AI indexable" />
                <Button type="submit">Create subject</Button>
              </form>
            </AdminDialog>
            <AdminDialog title="Create chapter" trigger={<CreateButton>Chapter</CreateButton>}>
              <form action={createChapterAction} className="grid gap-3" data-mutation-form>
                <Field label="Subject"><Select name="subject_id">{data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</Select></Field>
                <Field label="Title"><Input name="title" required /></Field>
                <Field label="Description"><Input name="description" /></Field>
                <Field label="Sort order"><Input name="sort_order" type="number" defaultValue={0} /></Field>
                <Field label="Status"><Select name="status" defaultValue="draft">{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</Select></Field>
                <CheckField name="is_ai_indexable" label="AI indexable" />
                <Button type="submit">Create chapter</Button>
              </form>
            </AdminDialog>
            <AdminDialog title="Create question" trigger={<CreateButton>Question</CreateButton>}>
              <form action={createQuestionAction} className="grid gap-3" data-mutation-form>
                <Field label="Chapter"><Select name="chapter_id">{data.chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}</Select></Field>
                <Field label="Title"><Input name="title" required /></Field>
                <MarkdownLatexEditor label="Question text" name="question_text" required />
                <Field label="Description"><Input name="description" /></Field>
                <Field label="Sort order"><Input name="sort_order" type="number" defaultValue={0} /></Field>
                <Field label="Status"><Select name="status" defaultValue="draft">{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</Select></Field>
                <CheckField name="is_ai_indexable" label="AI indexable" />
                <Button type="submit">Create question</Button>
              </form>
            </AdminDialog>
          </div>
        }
      />
      <section className="min-w-0 overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
        <div className="border-b border-border/70 bg-muted/25 px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Content hierarchy</h2>
          <p className="mt-1 text-xs text-muted-foreground">Click parent rows to collapse or expand children.</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-background/60">
              <TableHead className="min-w-[420px] px-4">Content</TableHead>
              <TableHead className="min-w-[220px]">Parent / Context</TableHead>
              <TableHead className="w-[88px] text-center">Sort</TableHead>
              <TableHead className="w-[130px]">Status</TableHead>
              <TableHead className="w-[190px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contentRows.length === 0 ? <EmptyTable colSpan={5} label="No syllabus content yet. Create a year to start the hierarchy." /> : null}
            {visibleRows.map((row) => (
              <ContentTreeRow
                key={`${row.kind}-${row.item.id}`}
                row={row}
                expanded={!collapsed.has(row.toggleId)}
                onToggle={toggleRow}
                editDialog={editDialog(row)}
              />
            ))}
          </TableBody>
        </Table>
      </section>
    </>
  );
}
