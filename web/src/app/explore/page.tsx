import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { CourseExploreList, type ExploreCourse } from "@/components/course-explore-list";
import { joinTrip } from "@/app/actions";
import styles from "./page.module.css";

export default async function ExplorePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const [{ data: publicTrips }, { data: memberships }, { data: courses }, { data: reviews }] = await Promise.all([
    supabase
      .from("trips")
      .select("id, code, name, location, start_date, seeking_active, seeking_spots, seeking_note")
      .eq("is_public", true)
      .order("seeking_active", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("trip_members").select("trip_id").eq("profile_id", data.user.id),
    supabase.from("courses").select("id, name, city, region, country").order("name"),
    supabase.from("course_reviews").select("course_name, rating"),
  ]);

  const myTripIds = new Set((memberships ?? []).map((m) => m.trip_id));

  const ratingsByCourse = new Map<string, { total: number; count: number }>();
  for (const r of reviews ?? []) {
    const entry = ratingsByCourse.get(r.course_name) ?? { total: 0, count: 0 };
    entry.total += r.rating;
    entry.count += 1;
    ratingsByCourse.set(r.course_name, entry);
  }

  const exploreCourses: ExploreCourse[] = (courses ?? []).map((c) => {
    const agg = ratingsByCourse.get(c.name);
    return {
      id: c.id,
      name: c.name,
      city: c.city,
      region: c.region,
      country: c.country,
      avgRating: agg ? agg.total / agg.count : null,
      reviewCount: agg?.count ?? 0,
    };
  });

  return (
    <>
      <AppHeader />
      <main className={styles.main}>
        <div className={styles.card}>
          <h3>Public Trips</h3>
          <div className={styles.hint} style={{ marginTop: -8, marginBottom: 10 }}>
            Trips other golfers have opened up — join one, or find a fourth.
          </div>
          {publicTrips && publicTrips.length > 0 ? (
            publicTrips.map((t) => (
              <div key={t.id} className={styles.tripRow}>
                <div>
                  <div className={styles.tripName}>{t.name}</div>
                  <div className={styles.tripMeta}>
                    {t.location}
                    {t.start_date ? ` · ${t.start_date}` : ""}
                  </div>
                  {t.seeking_active && (
                    <div className={styles.seeking}>
                      🔍 Looking for {t.seeking_spots} more{t.seeking_note ? ` — ${t.seeking_note}` : ""}
                    </div>
                  )}
                </div>
                {myTripIds.has(t.id) ? (
                  <Link href={`/t/${t.code}`} className={styles.btnOutline}>
                    View
                  </Link>
                ) : (
                  <form action={joinTrip}>
                    <input type="hidden" name="code" value={t.code} />
                    <button type="submit" className={styles.btn}>
                      Join
                    </button>
                  </form>
                )}
              </div>
            ))
          ) : (
            <div className={styles.emptyMini}>No public trips right now.</div>
          )}
        </div>

        <div className={styles.card}>
          <h3>Courses</h3>
          <CourseExploreList courses={exploreCourses} />
        </div>
      </main>
      <BottomNav active="explore" />
    </>
  );
}
