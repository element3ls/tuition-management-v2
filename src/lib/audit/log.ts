import "server-only";

import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganizationId } from "@/lib/tenancy/server";
import type { AuditAction } from "@/types/domain";

type LogAuditInput = {
  organizationId?: string;
  actorId: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId: string | null;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
};

export async function logAudit(input: LogAuditInput) {
  if (isDemoMode() || !isSupabaseConfigured()) {
    return;
  }

  const supabase = createAdminClient();
  await supabase.from("audit_logs").insert({
    organization_id: input.organizationId ?? (await getCurrentOrganizationId()),
    actor_id: input.actorId,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId,
    before_data: input.beforeData ?? null,
    after_data: input.afterData ?? null
  });
}
