import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google/Apple redirect back here with a PKCE `code` after the user
// approves sign-in. Exchange it for a session, then send them home.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
