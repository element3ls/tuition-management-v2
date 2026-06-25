import { describe, expect, it } from "vitest";
import { cloneDemoData, demoIds } from "@/lib/demo-data";
import { canAccessResource, getAccessibleContentTree } from "@/lib/permissions";
import { searchAccessibleContent } from "@/lib/search";
import { createMaterialSignedUrl } from "@/lib/storage/materials";

describe("student access integration flow", () => {
  it("connects membership, group grant, browsing, search, and signed URL authorization", async () => {
    const data = cloneDemoData();
    data.memberships = [];
    data.accessGrants = [];

    await expect(
      canAccessResource({ userId: demoIds.student, resourceType: "recording", resourceId: demoIds.recording, permission: "view" }, data)
    ).resolves.toBe(false);

    data.memberships.push({
      organization_id: demoIds.organization,
      id: "11000000-0000-4000-8000-000000000099",
      student_id: demoIds.student,
      group_id: demoIds.group,
      status: "active",
      starts_at: "2026-01-01T00:00:00.000Z",
      expires_at: null,
      created_at: "2026-05-17T00:00:00.000Z"
    });
    data.accessGrants.push({
      organization_id: demoIds.organization,
      id: "80000000-0000-4000-8000-000000000099",
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
      created_at: "2026-05-17T00:00:00.000Z"
    });

    const tree = await getAccessibleContentTree(demoIds.student, data);
    expect(tree.years[0]?.subjects[0]?.chapters[0]?.recordings[0]?.id).toBe(demoIds.recording);

    const searchResults = await searchAccessibleContent({ userId: demoIds.student, query: "solution", data });
    expect(searchResults.some((result) => result.id === demoIds.material)).toBe(true);

    const signedUrl = await createMaterialSignedUrl({ userId: demoIds.student, materialId: demoIds.material, permission: "download", data });
    expect(signedUrl.ok).toBe(true);
  });
});
