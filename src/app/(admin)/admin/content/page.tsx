import { ContentHierarchyManager } from "@/app/(admin)/admin/content/content-hierarchy-manager";
import { getAppData } from "@/server/data/app-data";

export default async function ContentPage() {
  const data = await getAppData();
  return <ContentHierarchyManager data={data} />;
}
