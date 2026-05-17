import { AdminLayout } from "@/components/layout/admin-layout";
import { requireAdminAccess } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { user, roles } = await requireAdminAccess();
  return <AdminLayout user={user} roles={roles}>{children}</AdminLayout>;
}
