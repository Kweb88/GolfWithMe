"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleRoundLike } from "@/app/actions";
import styles from "./round-like-button.module.css";

export function RoundLikeButton({
  roundId,
  count,
  likedByMe,
}: {
  roundId: string;
  count: number;
  likedByMe: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      className={`${styles.likeBtn} ${likedByMe ? styles.liked : ""}`}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await toggleRoundLike(roundId);
          router.refresh();
        })
      }
    >
      {likedByMe ? "❤️" : "🤍"} {count > 0 ? count : ""}
    </button>
  );
}
