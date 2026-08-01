import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { AvatarPicker } from "@/components/avatar-picker";
import { AvatarUpload } from "@/components/avatar-upload";
import { InviteFriendButton } from "@/components/invite-friend-button";
import { ExportDataButton } from "@/components/export-data-button";
import { DeleteAccountButton } from "@/components/delete-account-button";
import { computeCrew } from "@/lib/crew";
import { updateProfile } from "@/app/actions";
import styles from "./page.module.css";

const FORMATS = ["Stroke Play", "Match Play", "Skins", "Nassau", "Scramble", "Ryder Cup"];

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, avatar_emoji, avatar_url, home_course, favorite_format, bio")
    .eq("id", data.user.id)
    .single();

  const { data: memberships } = await supabase.from("trip_members").select("trip_id").eq("profile_id", data.user.id);
  const tripIds = [...new Set((memberships ?? []).map((m) => m.trip_id))];

  let crew: { name: string; count: number }[] = [];
  if (tripIds.length > 0) {
    const { data: allMembers } = await supabase.from("trip_members").select("name").in("trip_id", tripIds);
    crew = computeCrew(profile?.name ?? "", allMembers ?? []);
  }

  return (
    <>
      <AppHeader />
      <main className={styles.main}>
        <div className={styles.profileCard}>
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className={styles.bigPhoto} />
          ) : (
            <div className={styles.bigAvatar}>{profile?.avatar_emoji ?? "⛳"}</div>
          )}
          <div className={styles.name}>{profile?.name}</div>
          {profile?.home_course && <div className={styles.hint}>🏠 {profile.home_course}</div>}
          <div className={styles.hint}>Favorite format: {profile?.favorite_format ?? "Stroke Play"}</div>
          {profile?.bio && <div className={styles.bio}>&quot;{profile.bio}&quot;</div>}
        </div>

        <div className={styles.card}>
          <h3>Your Golf Life</h3>
          <div className={styles.stat}>
            {tripIds.length} trip{tripIds.length === 1 ? "" : "s"}
          </div>
          <div className={styles.hint}>Your profile follows you into every trip you create or join.</div>
        </div>

        <div className={styles.card}>
          <h3>Your Crew</h3>
          {crew.length > 0 ? (
            crew.map((c) => (
              <div key={c.name} className={styles.crewRow}>
                <span className={styles.crewName}>{c.name}</span>
                <span className={styles.crewCount}>
                  {c.count} trip{c.count === 1 ? "" : "s"}
                </span>
              </div>
            ))
          ) : (
            <div className={styles.emptyMini}>Play a few trips together and your regular crew shows up here.</div>
          )}
        </div>

        <div className={styles.card}>
          <h3>Profile Photo</h3>
          <AvatarUpload userId={data.user.id} currentUrl={profile?.avatar_url ?? null} />
        </div>

        <div className={styles.card}>
          <h3>Account</h3>
          <div className={styles.accountActions}>
            <InviteFriendButton />
            <Link href="/help" className={styles.outlineLink}>
              Help &amp; FAQ
            </Link>
            <ExportDataButton />
          </div>
          <div className={styles.dangerZone}>
            <div className={styles.hint} style={{ marginBottom: 8 }}>
              Deleting your account removes your login and profile. Trips you&apos;re part of stay intact for other
              members.
            </div>
            <DeleteAccountButton />
          </div>
        </div>

        <div className={styles.card}>
          <h3>Edit Profile</h3>
          <div className={styles.hint} style={{ marginTop: -8, marginBottom: 10 }}>
            No photo? Pick an emoji avatar instead.
          </div>
          <form action={updateProfile}>
            <AvatarPicker initial={profile?.avatar_emoji ?? "⛳"} />
            <div className={styles.field} style={{ marginTop: 12 }}>
              <label htmlFor="name">Name</label>
              <input id="name" name="name" type="text" defaultValue={profile?.name} required />
            </div>
            <div className={styles.field} style={{ marginTop: 10 }}>
              <label htmlFor="homeCourse">Home Course</label>
              <input id="homeCourse" name="homeCourse" type="text" defaultValue={profile?.home_course ?? ""} />
            </div>
            <div className={styles.field} style={{ marginTop: 10 }}>
              <label htmlFor="favoriteFormat">Favorite Format</label>
              <select id="favoriteFormat" name="favoriteFormat" defaultValue={profile?.favorite_format ?? "Stroke Play"}>
                {FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field} style={{ marginTop: 10 }}>
              <label htmlFor="bio">Bio</label>
              <textarea id="bio" name="bio" rows={3} defaultValue={profile?.bio ?? ""} />
            </div>
            <button type="submit" className={styles.btn}>
              Save
            </button>
          </form>
        </div>
      </main>
      <BottomNav active="profile" />
    </>
  );
}
