import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { CoursePicker } from "@/components/course-picker";
import { RoundFormatFields } from "@/components/round-format-fields";
import { createRound } from "@/app/actions";
import styles from "@/app/page.module.css";

export default async function NewRoundPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: trip } = await supabase
    .from("trips")
    .select("id, code, name, team_a_name, team_b_name")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (!trip) notFound();

  const [{ data: courses }, { data: players }] = await Promise.all([
    supabase.from("courses").select("id, name, city, region, country").order("name"),
    supabase.from("trip_members").select("id, name, team").eq("trip_id", trip.id).order("joined_at"),
  ]);

  const ryderTeamAPlayers = (players ?? []).filter((p) => p.team === "a");
  const ryderTeamBPlayers = (players ?? []).filter((p) => p.team === "b");

  const createRoundForTrip = createRound.bind(null, trip.id, trip.code);

  return (
    <>
      <AppHeader tripCode={trip.code} />
      <main className={styles.main}>
        <div className={styles.card}>
          <h3>Log a Round</h3>
          <form action={createRoundForTrip}>
            <CoursePicker courses={courses ?? []} />
            <div className={styles.row} style={{ marginTop: 10 }}>
              <div className={styles.field}>
                <label htmlFor="roundDate">Date</label>
                <input id="roundDate" name="roundDate" type="date" />
              </div>
            </div>
            <RoundFormatFields
              players={players ?? []}
              ryderTeamAName={trip.team_a_name}
              ryderTeamBName={trip.team_b_name}
              ryderTeamAPlayers={ryderTeamAPlayers}
              ryderTeamBPlayers={ryderTeamBPlayers}
            />
            <div className={styles.hint}>Set either bet to 0 to skip it.</div>
            <button type="submit" className={styles.btn}>
              Create Round
            </button>
          </form>
        </div>
      </main>
      <BottomNav active="trips" />
    </>
  );
}
