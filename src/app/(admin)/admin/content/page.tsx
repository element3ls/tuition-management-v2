import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ContentHierarchyManager } from "@/app/(admin)/admin/content/content-hierarchy-manager";
import { getAppData } from "@/server/data/app-data";

export default async function ContentPage() {
  const data = await getAppData();
  return (
    <>
      <Breadcrumb items={[{ label: "Admin", href: "/admin" }, { label: "Syllabus content" }]} />
      <ContentHierarchyManager data={data} />
    </>
  );
}
