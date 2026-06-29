import "server-only";

import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganizationId } from "@/lib/tenancy/server";
import type { ActivityEventType } from "@/types/domain";

type LogActivityInput = {
  organizationId?: string;
  userId: string;
  eventType: ActivityEventType;
  resourceType: string | null;
  resourceId: string | null;
  metadata?: Record<string, unknown>;
};

export async function logActivityEvent(input: LogActivityInput) {
  if (isDemoMode() || !isSupabaseConfigured()) {
    return;
  }

  const supabase = createAdminClient();
  await supabase.from("activity_events").insert({
    organization_id: input.organizationId ?? (await getCurrentOrganizationId()),
    user_id: input.userId,
    event_type: input.eventType,
    resource_type: input.resourceType,
    resource_id: input.resourceId,
    metadata: input.metadata ?? {}
  });
}
