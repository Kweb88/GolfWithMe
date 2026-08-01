import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { CoursePicker } from "@/components/course-picker";
import { createRound } from "@/app/actions";
import styles from "@/app/page.module.css";

export default async function NewRoundPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: trip } = await supabase
    .from("trips")
    .select("id, code, name")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (!trip) notFound();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, name, city, region, country")
    .order("name");

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
            <div className={styles.row} style={{ marginTop: 10 }}>
              <div className={styles.field}>
                <label htmlFor="skinsBet">Skins bet ($/hole)</label>
                <input id="skinsBet" name="skinsBet" type="number" min="0" step="0.5" defaultValue="2" />
              </div>
              <div className={styles.field}>
                <label htmlFor="nassauBet">Nassau bet ($/segment)</label>
                <input id="nassauBet" name="nassauBet" type="number" min="0" step="1" defaultValue="10" />
              </div>
            </div>
            <div className={styles.hint}>
              Stroke Play for now — Match Play, Scramble, and Ryder Cup are coming next. Set either bet to 0 to
              skip it.
            </div>
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
