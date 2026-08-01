"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFeedReaction } from "@/app/actions";
import { relativeTime } from "@/lib/time";
import styles from "./feed-post-card.module.css";

export type FeedPostView = {
  id: string;
  authorName: string;
  type: string;
  text: string | null;
  photoUrl: string | null;
  createdAt: string;
  tripName: string;
};

export function FeedPostCard({
  post,
  reaction,
}: {
  post: FeedPostView;
  reaction: { count: number; likedByMe: boolean };
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.author}>{post.authorName}</span>
        <span className={styles.tripBadge}>{post.tripName}</span>
        <span className={styles.time}>{relativeTime(post.createdAt)}</span>
      </div>
      {post.text && <p className={styles.text}>{post.text}</p>}
      {post.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.photoUrl} alt="" className={styles.photo} />
      )}
      <button
        type="button"
        className={`${styles.likeBtn} ${reaction.likedByMe ? styles.liked : ""}`}
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await toggleFeedReaction(post.id);
            router.refresh();
          })
        }
      >
        {reaction.likedByMe ? "❤️" : "🤍"} {reaction.count > 0 ? reaction.count : ""}
      </button>
    </div>
  );
}
