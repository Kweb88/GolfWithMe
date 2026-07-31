import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, avatar_emoji, home_course")
    .eq("id", data.user.id)
    .single();

  return (
    <main style={{ padding: 24 }}>
      <h1 className="display">
        Welcome{profile?.name ? `, ${profile.name}` : ""} {profile?.avatar_emoji ?? "⛳"}
      </h1>
      <p style={{ color: "var(--text-soft)", marginTop: 8 }}>
        You&apos;re signed in via Supabase Auth. Trips, Feed, and Explore are being rebuilt on this
        foundation next.
      </p>
      <div style={{ marginTop: 16 }}>
        <SignOutButton />
      </div>
    </main>
  );
}
