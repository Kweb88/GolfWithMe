"use client";

import { useState } from "react";
import styles from "./avatar-picker.module.css";

const AVATAR_OPTS = [
  "⛳", "🏌️", "🏆", "🥇", "🐦", "🦅", "🔥", "⭐", "🎯", "🍀",
  "😎", "🦁", "🐯", "🐻", "🦊", "🐺", "🐸", "🦄", "👑", "🥷",
  "🤠", "🧢", "💪", "⚡", "🌵", "🍺", "🎩", "🕶️", "🚀", "😂",
];

export function AvatarPicker({ initial }: { initial: string }) {
  const [picked, setPicked] = useState(initial);

  return (
    <div>
      <div className={styles.big}>{picked}</div>
      <div className={styles.grid}>
        {AVATAR_OPTS.map((e) => (
          <button
            key={e}
            type="button"
            className={`${styles.opt} ${picked === e ? styles.selected : ""}`}
            onClick={() => setPicked(e)}
          >
            {e}
          </button>
        ))}
      </div>
      <input type="hidden" name="avatarEmoji" value={picked} />
    </div>
  );
}
