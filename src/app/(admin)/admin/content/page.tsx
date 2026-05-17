import { PageHeading } from "@/components/layout/page-heading";
import {
  createChapterAction,
  createQuestionAction,
  createSubjectAction,
  createYearAction,
  setContentStatusAction
} from "@/features/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAppData } from "@/server/data/app-data";

export default async function ContentPage() {
  const data = await getAppData();

  return (
    <>
      <PageHeading title="Syllabus content" description="Manage years, subjects, chapters, and questions." />
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Create year</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createYearAction} className="grid gap-3">
                <Input name="name" placeholder="Year name" required />
                <Input name="description" placeholder="Description" />
                <Input name="sort_order" placeholder="Sort order" type="number" defaultValue={0} />
                <Select name="status" defaultValue="draft">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </Select>
                <label className="flex items-center gap-2 text-sm">
                  <input name="is_ai_indexable" type="checkbox" /> AI indexable
                </label>
                <Button type="submit">Create year</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Create subject</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createSubjectAction} className="grid gap-3">
                <Select name="year_id">
                  {data.years.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name}
                    </option>
                  ))}
                </Select>
                <Input name="name" placeholder="Subject name" required />
                <Input name="description" placeholder="Description" />
                <Input name="sort_order" placeholder="Sort order" type="number" defaultValue={0} />
                <Select name="status" defaultValue="draft">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </Select>
                <Button type="submit">Create subject</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Create chapter</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createChapterAction} className="grid gap-3">
                <Select name="subject_id">
                  {data.subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </Select>
                <Input name="title" placeholder="Chapter title" required />
                <Input name="description" placeholder="Description" />
                <Input name="sort_order" placeholder="Sort order" type="number" defaultValue={0} />
                <Select name="status" defaultValue="draft">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </Select>
                <Button type="submit">Create chapter</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Create question</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createQuestionAction} className="grid gap-3">
                <Select name="chapter_id">
                  {data.chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.title}
                    </option>
                  ))}
                </Select>
                <Input name="title" placeholder="Question title" required />
                <Textarea name="question_text" placeholder="Question text" required />
                <Input name="description" placeholder="Description" />
                <Input name="sort_order" placeholder="Sort order" type="number" defaultValue={0} />
                <Select name="status" defaultValue="draft">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </Select>
                <Button type="submit">Create question</Button>
              </form>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Years</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.years.map((year) => (
                  <TableRow key={year.id}>
                    <TableCell>{year.name}</TableCell>
                    <TableCell>{data.subjects.filter((subject) => subject.year_id === year.id).length}</TableCell>
                    <TableCell>
                      <Badge>{year.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <form action={setContentStatusAction} className="flex gap-2">
                        <input name="resource_type" type="hidden" value="year" />
                        <input name="resource_id" type="hidden" value={year.id} />
                        <Select name="status" defaultValue={year.status}>
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                          <option value="archived">Archived</option>
                        </Select>
                        <Button type="submit" variant="outline">
                          Save
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Chapters and questions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chapter</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.chapters.map((chapter) => {
                  const subject = data.subjects.find((item) => item.id === chapter.subject_id);
                  return (
                    <TableRow key={chapter.id}>
                      <TableCell>{chapter.title}</TableCell>
                      <TableCell>{subject?.name}</TableCell>
                      <TableCell>{data.questions.filter((question) => question.chapter_id === chapter.id).length}</TableCell>
                      <TableCell>
                        <Badge>{chapter.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <form action={setContentStatusAction} className="flex gap-2">
                          <input name="resource_type" type="hidden" value="chapter" />
                          <input name="resource_id" type="hidden" value={chapter.id} />
                          <Select name="status" defaultValue={chapter.status}>
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                            <option value="archived">Archived</option>
                          </Select>
                          <Button type="submit" variant="outline">
                            Save
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </div>
      </div>
    </>
  );
}
