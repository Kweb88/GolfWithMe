import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { addPlayer } from "../../actions";
import styles from "./page.module.css";

export default async function TripPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: trip } = await supabase
    .from("trips")
    .select("id, code, name, location, start_date, end_date")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (!trip) {
    return (
      <>
        <AppHeader />
        <main className={styles.main}>
          <div className={styles.notFound}>
            <p>No trip found for code {code.toUpperCase()}.</p>
          </div>
        </main>
      </>
    );
  }

  const [{ data: players }, { data: membership }] = await Promise.all([
    supabase
      .from("trip_members")
      .select("id, name, venmo, cashapp, zelle")
      .eq("trip_id", trip.id)
      .order("joined_at", { ascending: true }),
    supabase
      .from("trip_members")
      .select("id")
      .eq("trip_id", trip.id)
      .eq("profile_id", data.user.id)
      .maybeSingle(),
  ]);

  const isMember = !!membership;
  const addPlayerForTrip = addPlayer.bind(null, trip.id);

  return (
    <>
      <AppHeader tripCode={trip.code} />
      <main className={styles.main}>
        <div className={styles.card}>
          <h3>{trip.name}</h3>
          <div className={styles.hint}>
            {trip.location}
            {trip.start_date ? ` · ${trip.start_date}` : ""}
            {trip.end_date ? ` – ${trip.end_date}` : ""}
          </div>
          <div className={styles.hint}>
            Share code <b>{trip.code}</b> — anyone who joins sees and edits the same live trip.
          </div>
        </div>

        <div className={styles.card}>
          <h3>Players</h3>
          {players && players.length > 0 ? (
            players.map((p) => (
              <div key={p.id} className={styles.playerRow}>
                <span className={styles.playerName}>{p.name}</span>
                <span className={styles.playerContact}>
                  {p.venmo ? `@${p.venmo}` : "no venmo"}
                  {p.cashapp ? ` · $${p.cashapp}` : ""}
                  {p.zelle ? ` · ${p.zelle}` : ""}
                </span>
              </div>
            ))
          ) : (
            <div className={styles.emptyMini}>No players yet.</div>
          )}
        </div>

        {isMember && (
          <div className={styles.card}>
            <h3>Add a Player</h3>
            <form action={addPlayerForTrip}>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="name">Name</label>
                  <input id="name" name="name" type="text" required />
                </div>
                <div className={styles.field}>
                  <label htmlFor="venmo">Venmo</label>
                  <input id="venmo" name="venmo" type="text" placeholder="username" />
                </div>
              </div>
              <button type="submit" className={styles.btn}>
                Add Player
              </button>
            </form>
          </div>
        )}
      </main>
    </>
  );
}
