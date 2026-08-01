"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTripVisibility } from "@/app/actions";
import styles from "@/app/t/[code]/page.module.css";

export function TripVisibilityForm({
  tripId,
  isPublic: initialIsPublic,
  seekingActive: initialSeekingActive,
  seekingSpots,
  seekingNote,
}: {
  tripId: string;
  isPublic: boolean;
  seekingActive: boolean;
  seekingSpots: number;
  seekingNote: string | null;
}) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [seekingActive, setSeekingActive] = useState(initialSeekingActive);
  const router = useRouter();
  const updateForTrip = updateTripVisibility.bind(null, tripId);

  return (
    <form
      action={async (formData) => {
        await updateForTrip(formData);
        router.refresh();
      }}
    >
      <label className={styles.checkboxRow}>
        <input type="checkbox" name="isPublic" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
        Make this trip public
      </label>

      {isPublic && (
        <>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              name="seekingActive"
              checked={seekingActive}
              onChange={(e) => setSeekingActive(e.target.checked)}
            />
            Looking for more players
          </label>

          {seekingActive && (
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="seekingSpots">Spots open</label>
                <input id="seekingSpots" name="seekingSpots" type="number" min="1" max="20" defaultValue={seekingSpots} />
              </div>
              <div className={styles.field}>
                <label htmlFor="seekingNote">Note</label>
                <input
                  id="seekingNote"
                  name="seekingNote"
                  type="text"
                  defaultValue={seekingNote ?? ""}
                  placeholder="e.g. Need 2 more for Sat morning"
                />
              </div>
            </div>
          )}
        </>
      )}

      <button type="submit" className={styles.btn}>
        Save
      </button>
    </form>
  );
}
