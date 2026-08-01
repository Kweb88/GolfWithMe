"use client";

import { deleteAccount } from "@/app/actions";
import styles from "./delete-account-button.module.css";

export function DeleteAccountButton() {
  return (
    <form
      action={deleteAccount}
      onSubmit={(e) => {
        const confirmed = window.confirm(
          "Delete your GolfWithMe account? This removes your login and profile permanently. Trips you're part of stay intact for other members. This can't be undone.",
        );
        if (!confirmed) e.preventDefault();
      }}
    >
      <button type="submit" className={styles.deleteBtn}>
        Delete Account
      </button>
    </form>
  );
}
