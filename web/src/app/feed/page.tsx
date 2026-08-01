import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { FeedComposer } from "@/components/feed-composer";
import { FeedPostCard } from "@/components/feed-post-card";
import styles from "./page.module.css";

type FeedPostRow = {
  id: string;
  trip_id: string;
  author_name: string;
  type: string;
  text: string | null;
  photo_url: string | null;
  created_at: string;
};

export default async function FeedPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: memberships } = await supabase.from("trip_members").select("trip_id").eq("profile_id", data.user.id);
  const tripIds = [...new Set((memberships ?? []).map((m) => m.trip_id))];

  let trips: { id: string; code: string; name: string }[] = [];
  let posts: FeedPostRow[] = [];
  if (tripIds.length > 0) {
    const [{ data: tripRows }, { data: postRows }] = await Promise.all([
      supabase.from("trips").select("id, code, name").in("id", tripIds),
      supabase
        .from("feed_posts")
        .select("id, trip_id, author_name, type, text, photo_url, created_at")
        .in("trip_id", tripIds)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    trips = tripRows ?? [];
    posts = postRows ?? [];
  }
  const tripsById = new Map(trips.map((t) => [t.id, t]));

  let reactionsByPost = new Map<string, { count: number; likedByMe: boolean }>();
  if (posts.length > 0) {
    const { data: reactions } = await supabase
      .from("feed_reactions")
      .select("post_id, profile_id")
      .in(
        "post_id",
        posts.map((p) => p.id),
      );
    reactionsByPost = new Map();
    for (const r of reactions ?? []) {
      const entry = reactionsByPost.get(r.post_id) ?? { count: 0, likedByMe: false };
      entry.count += 1;
      if (r.profile_id === data.user.id) entry.likedByMe = true;
      reactionsByPost.set(r.post_id, entry);
    }
  }

  return (
    <>
      <AppHeader />
      <main className={styles.main}>
        {trips.length > 0 ? (
          <FeedComposer userId={data.user.id} trips={trips.map((t) => ({ id: t.id, name: t.name }))} />
        ) : (
          <div className={styles.card}>
            <div className={styles.emptyMini}>Join or create a trip to start posting.</div>
          </div>
        )}

        {posts.length > 0 ? (
          posts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={{
                id: post.id,
                authorName: post.author_name,
                type: post.type,
                text: post.text,
                photoUrl: post.photo_url,
                createdAt: post.created_at,
                tripName: tripsById.get(post.trip_id)?.name ?? "",
              }}
              reaction={reactionsByPost.get(post.id) ?? { count: 0, likedByMe: false }}
            />
          ))
        ) : (
          <div className={styles.card}>
            <div className={styles.emptyMini}>No posts yet — log a round or say hi to get the feed going.</div>
          </div>
        )}
      </main>
      <BottomNav active="feed" />
    </>
  );
}
