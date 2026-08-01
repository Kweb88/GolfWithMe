"use client";

import { useState } from "react";
import styles from "./account-buttons.module.css";

export function InviteFriendButton() {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const url = window.location.origin;
    const text = `Join me on GolfWithMe — we plan our golf trips, keep score, and settle bets there. ${url}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "GolfWithMe", text, url });
      } catch {
        // user cancelled the share sheet — not an error
      }
      return;
    }

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" className={styles.outlineBtn} onClick={handleClick}>
      {copied ? "Copied!" : "Invite a Friend"}
    </button>
  );
}
