import { StudentLayout } from "@/components/layout/student-layout";
import { requireStudentAccess } from "@/lib/auth/session";
import { getCurrentOrganization } from "@/lib/tenancy/server";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const [{ user, roles }, organization] = await Promise.all([requireStudentAccess(), getCurrentOrganization()]);
  return (
    <StudentLayout user={user} roles={roles} orgSlug={organization?.slug}>
      {children}
    </StudentLayout>
  );
}
