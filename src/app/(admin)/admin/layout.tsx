import { AdminLayout } from "@/components/layout/admin-layout";
import { requireAdminAccess } from "@/lib/auth/session";
import { getCurrentOrganization } from "@/lib/tenancy/server";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const [{ user, roles }, organization] = await Promise.all([requireAdminAccess(), getCurrentOrganization()]);
  return (
    <AdminLayout user={user} roles={roles} orgSlug={organization?.slug}>
      {children}
    </AdminLayout>
  );
}
