import { AdminDialog, CheckField, CreateButton, EditButton, EmptyTable, Field, StatusBadge, statusOptions } from "@/components/admin/admin-ui";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createChapterAction,
  createQuestionAction,
  createSubjectAction,
  createYearAction,
  updateContentAction
} from "@/features/admin/actions";
import { getAppData } from "@/server/data/app-data";

export default async function ContentPage() {
  const data = await getAppData();

  return (
    <>
      <PageHeading
        title="Syllabus content"
        description="Edit years, subjects, chapters, questions, publishing status, and AI-ready flags."
        actions={
          <div className="flex flex-wrap gap-2">
            <AdminDialog title="Create year" trigger={<CreateButton>Year</CreateButton>}>
              <form action={createYearAction} className="grid gap-3">
                <Field label="Name"><Input name="name" required /></Field>
                <Field label="Description"><Input name="description" /></Field>
                <Field label="Sort order"><Input name="sort_order" type="number" defaultValue={0} /></Field>
                <Field label="Status"><Select name="status" defaultValue="draft">{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</Select></Field>
                <CheckField name="is_ai_indexable" label="AI indexable" />
                <Button type="submit">Create year</Button>
              </form>
            </AdminDialog>
            <AdminDialog title="Create subject" trigger={<CreateButton>Subject</CreateButton>}>
              <form action={createSubjectAction} className="grid gap-3">
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
              <form action={createChapterAction} className="grid gap-3">
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
              <form action={createQuestionAction} className="grid gap-3">
                <Field label="Chapter"><Select name="chapter_id">{data.chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}</Select></Field>
                <Field label="Title"><Input name="title" required /></Field>
                <Field label="Question text"><Textarea name="question_text" required /></Field>
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
      <div className="grid gap-5">
        <section className="min-w-0 overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead>Subjects</TableHead>
                <TableHead>Sort</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[110px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.years.length === 0 ? <EmptyTable colSpan={5} label="No years yet." /> : null}
              {data.years.map((year) => (
                <TableRow key={year.id}>
                  <TableCell><div className="font-medium">{year.name}</div><div className="text-xs text-muted-foreground">{year.description ?? "No description"}</div></TableCell>
                  <TableCell>{data.subjects.filter((subject) => subject.year_id === year.id).length}</TableCell>
                  <TableCell>{year.sort_order}</TableCell>
                  <TableCell><StatusBadge status={year.status} /></TableCell>
                  <TableCell className="text-right">
                    <AdminDialog title="Edit year" trigger={<EditButton />}>
                      <form action={updateContentAction} className="grid gap-3">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section className="min-w-0 overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Chapters</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[110px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.subjects.length === 0 ? <EmptyTable colSpan={5} label="No subjects yet." /> : null}
              {data.subjects.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell><div className="font-medium">{subject.name}</div><div className="text-xs text-muted-foreground">{subject.description ?? "No description"}</div></TableCell>
                  <TableCell>{data.years.find((year) => year.id === subject.year_id)?.name}</TableCell>
                  <TableCell>{data.chapters.filter((chapter) => chapter.subject_id === subject.id).length}</TableCell>
                  <TableCell><StatusBadge status={subject.status} /></TableCell>
                  <TableCell className="text-right">
                    <AdminDialog title="Edit subject" trigger={<EditButton />}>
                      <form action={updateContentAction} className="grid gap-3">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section className="min-w-0 overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chapter</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[110px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.chapters.length === 0 ? <EmptyTable colSpan={5} label="No chapters yet." /> : null}
              {data.chapters.map((chapter) => (
                <TableRow key={chapter.id}>
                  <TableCell><div className="font-medium">{chapter.title}</div><div className="text-xs text-muted-foreground">{chapter.description ?? "No description"}</div></TableCell>
                  <TableCell>{data.subjects.find((subject) => subject.id === chapter.subject_id)?.name}</TableCell>
                  <TableCell>{data.questions.filter((question) => question.chapter_id === chapter.id).length}</TableCell>
                  <TableCell><StatusBadge status={chapter.status} /></TableCell>
                  <TableCell className="text-right">
                    <AdminDialog title="Edit chapter" trigger={<EditButton />}>
                      <form action={updateContentAction} className="grid gap-3">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section className="min-w-0 overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Chapter</TableHead>
                <TableHead>Sort</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[110px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.questions.length === 0 ? <EmptyTable colSpan={5} label="No questions yet." /> : null}
              {data.questions.map((question) => (
                <TableRow key={question.id}>
                  <TableCell><div className="font-medium">{question.title}</div><div className="max-w-md truncate text-xs text-muted-foreground">{question.question_text}</div></TableCell>
                  <TableCell>{data.chapters.find((chapter) => chapter.id === question.chapter_id)?.title}</TableCell>
                  <TableCell>{question.sort_order}</TableCell>
                  <TableCell><StatusBadge status={question.status} /></TableCell>
                  <TableCell className="text-right">
                    <AdminDialog title="Edit question" trigger={<EditButton />}>
                      <form action={updateContentAction} className="grid gap-3">
                        <input name="resource_type" type="hidden" value="question" />
                        <input name="resource_id" type="hidden" value={question.id} />
                        <Field label="Chapter"><Select name="chapter_id" defaultValue={question.chapter_id}>{data.chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}</Select></Field>
                        <Field label="Title"><Input name="title" defaultValue={question.title} required /></Field>
                        <Field label="Question text"><Textarea name="question_text" defaultValue={question.question_text} required /></Field>
                        <Field label="Description"><Input name="description" defaultValue={question.description ?? ""} /></Field>
                        <Field label="Sort order"><Input name="sort_order" type="number" defaultValue={question.sort_order} /></Field>
                        <Field label="Status"><Select name="status" defaultValue={question.status}>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</Select></Field>
                        <CheckField name="is_ai_indexable" label="AI indexable" defaultChecked={question.is_ai_indexable} />
                        <Button type="submit">Save changes</Button>
                      </form>
                    </AdminDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </div>
    </>
  );
}
