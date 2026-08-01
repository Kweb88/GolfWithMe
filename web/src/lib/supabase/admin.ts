import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// Service-role client: bypasses RLS entirely. Only for server actions that
// need Supabase Auth admin APIs (e.g. deleting a user's login) that the
// RLS-scoped, cookie-authenticated client can't call. Never import this
// into anything that ships to the browser.
export function createAdminClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
