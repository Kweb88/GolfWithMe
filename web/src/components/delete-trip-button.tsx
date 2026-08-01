"use client";

import { deleteTrip } from "@/app/actions";
import styles from "./delete-trip-button.module.css";

export function DeleteTripButton({ tripId, tripName }: { tripId: string; tripName: string }) {
  const deleteTripForTrip = deleteTrip.bind(null, tripId);

  return (
    <form
      action={deleteTripForTrip}
      onSubmit={(e) => {
        const confirmed = window.confirm(
          `Delete "${tripName}"? This permanently removes all its rounds, scores, and posts for everyone. This can't be undone.`,
        );
        if (!confirmed) e.preventDefault();
      }}
    >
      <button type="submit" className={styles.deleteBtn}>
        Delete Trip
      </button>
    </form>
  );
}
