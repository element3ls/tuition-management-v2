import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getServiceRoleEnv } from "@/lib/env";

export function createAdminClient() {
  const { url, serviceRoleKey } = getServiceRoleEnv();

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
