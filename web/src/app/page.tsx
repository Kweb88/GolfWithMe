import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { createTrip, joinTrip } from "./actions";
import styles from "./page.module.css";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("trip_members")
    .select("trip_id")
    .eq("profile_id", data.user.id);

  const tripIds = (memberships ?? []).map((m) => m.trip_id);

  const { data: trips } = tripIds.length
    ? await supabase
        .from("trips")
        .select("code, name, location, start_date, end_date")
        .in("id", tripIds)
        .order("created_at", { ascending: false })
    : { data: [] as never[] };

  return (
    <>
      <AppHeader />
      <main className={styles.main}>
        {trips && trips.length > 0 ? (
          <div className={styles.tripGrid}>
            {trips.map((t) => (
              <Link key={t.code} href={`/t/${t.code}`} className={styles.tripCard}>
                <span className={styles.codeTag}>{t.code}</span>
                <h4>{t.name}</h4>
                <div className="mono meta" style={{ color: "var(--text-soft)", fontSize: 12 }}>
                  {t.location}
                  {t.start_date ? ` · ${t.start_date}` : ""}
                  {t.end_date ? ` – ${t.end_date}` : ""}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.emptyMini}>
            No trips yet. Create one below, or join a friend&apos;s with their code.
          </div>
        )}

        <div className={styles.card}>
          <h3>Start a Trip</h3>
          <form action={createTrip}>
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="name">Trip name</label>
                <input id="name" name="name" type="text" placeholder="Myrtle Beach 2026" required />
              </div>
            </div>
            <div className={styles.row} style={{ marginTop: 10 }}>
              <div className={styles.field}>
                <label htmlFor="location">Location</label>
                <input id="location" name="location" type="text" placeholder="Myrtle Beach, SC" />
              </div>
              <div className={styles.field}>
                <label htmlFor="startDate">Start</label>
                <input id="startDate" name="startDate" type="date" />
              </div>
              <div className={styles.field}>
                <label htmlFor="endDate">End</label>
                <input id="endDate" name="endDate" type="date" />
              </div>
            </div>
            <button type="submit" className={styles.btn}>
              Create Trip
            </button>
          </form>
        </div>

        <div className={styles.card}>
          <h3>Join a Trip</h3>
          <form action={joinTrip}>
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="code">Trip code</label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  placeholder="ABCDE"
                  maxLength={5}
                  style={{ textTransform: "uppercase" }}
                  required
                />
              </div>
            </div>
            <button type="submit" className={styles.btn}>
              Join Trip
            </button>
          </form>
        </div>
      </main>
      <BottomNav active="trips" />
    </>
  );
}
