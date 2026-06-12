import { describe, expect, it } from "vitest";
import { cloneDemoData, demoIds } from "@/lib/demo-data";
import { searchAccessibleContent } from "@/lib/search";

describe("searchAccessibleContent", () => {
  it("returns only permission-filtered results", async () => {
    const data = cloneDemoData();
    const allowed = await searchAccessibleContent({ userId: demoIds.student, query: "equations", data });
    const denied = await searchAccessibleContent({ userId: demoIds.otherStudent, query: "equations", data });

    expect(allowed.map((result) => result.title)).toContain("Linear Equations");
    expect(allowed.map((result) => result.title)).toContain("Linear Equations Practice Exam");
    expect(denied).toEqual([]);
  });

  it("does not return unpublished content", async () => {
    const data = cloneDemoData();
    data.chapters[0].status = "draft";
    data.exams[0].status = "review";

    await expect(searchAccessibleContent({ userId: demoIds.student, query: "linear", data })).resolves.toEqual([]);
  });
});
