import { StudentLayout } from "@/components/layout/student-layout";
import { requireStudentAccess } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { user, roles } = await requireStudentAccess();
  return <StudentLayout user={user} roles={roles}>{children}</StudentLayout>;
}
