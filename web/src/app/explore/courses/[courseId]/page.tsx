import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { relativeTime } from "@/lib/time";
import { submitCourseReview } from "@/app/actions";
import styles from "./page.module.css";

export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: course } = await supabase
    .from("courses")
    .select("id, name, city, region, country")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) notFound();

  const { data: reviews } = await supabase
    .from("course_reviews")
    .select("id, author_id, rating, review, created_at")
    .eq("course_name", course.name)
    .order("created_at", { ascending: false });

  const authorIds = [...new Set((reviews ?? []).map((r) => r.author_id))];
  const { data: authors } =
    authorIds.length > 0 ? await supabase.from("profiles").select("id, name").in("id", authorIds) : { data: [] };
  const nameById = new Map((authors ?? []).map((a) => [a.id, a.name]));

  const avgRating = reviews && reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  const myReview = reviews?.find((r) => r.author_id === data.user.id) ?? null;

  const submitReviewForCourse = submitCourseReview.bind(null, course.name);

  return (
    <>
      <AppHeader />
      <main className={styles.main}>
        <div className={styles.card}>
          <h3>{course.name}</h3>
          <div className={styles.hint}>{[course.city, course.region, course.country].filter(Boolean).join(", ")}</div>
          <div className={styles.avg}>
            {avgRating !== null ? (
              <>
                ⭐ {avgRating.toFixed(1)} <span className={styles.count}>({reviews!.length} review{reviews!.length === 1 ? "" : "s"})</span>
              </>
            ) : (
              <span className={styles.count}>No reviews yet — be the first.</span>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <h3>{myReview ? "Update Your Review" : "Leave a Review"}</h3>
          <form action={submitReviewForCourse}>
            <div className={styles.field}>
              <label htmlFor="rating">Rating</label>
              <select id="rating" name="rating" defaultValue={myReview?.rating ?? 5}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {"⭐".repeat(n)} ({n})
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field} style={{ marginTop: 10 }}>
              <label htmlFor="review">Review</label>
              <textarea id="review" name="review" rows={3} defaultValue={myReview?.review ?? ""} placeholder="How was the course, conditions, pace of play..." />
            </div>
            <button type="submit" className={styles.btn}>
              {myReview ? "Update Review" : "Post Review"}
            </button>
          </form>
        </div>

        <div className={styles.card}>
          <h3>Reviews</h3>
          {reviews && reviews.length > 0 ? (
            reviews.map((r) => (
              <div key={r.id} className={styles.reviewRow}>
                <div className={styles.reviewMeta}>
                  <span className={styles.reviewAuthor}>{nameById.get(r.author_id) ?? "Someone"}</span>
                  <span className={styles.reviewStars}>{"⭐".repeat(r.rating)}</span>
                  <span className={styles.reviewTime}>{relativeTime(r.created_at)}</span>
                </div>
                {r.review && <div className={styles.reviewText}>{r.review}</div>}
              </div>
            ))
          ) : (
            <div className={styles.emptyMini}>No reviews yet.</div>
          )}
        </div>
      </main>
      <BottomNav active="explore" />
    </>
  );
}
