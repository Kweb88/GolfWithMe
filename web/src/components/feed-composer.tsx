"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createFeedPost } from "@/app/actions";
import styles from "./feed-composer.module.css";

export function FeedComposer({ trips }: { trips: { id: string; name: string }[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [showPhoto, setShowPhoto] = useState(false);
  const router = useRouter();

  return (
    <div className={styles.card}>
      <form
        ref={formRef}
        action={async (formData) => {
          await createFeedPost(formData);
          formRef.current?.reset();
          setShowPhoto(false);
          router.refresh();
        }}
      >
        <select name="tripId" className={styles.tripSelect} required defaultValue={trips[0]?.id}>
          {trips.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <textarea name="text" className={styles.textarea} placeholder="Share something with the crew..." rows={2} />
        {showPhoto ? (
          <input name="photoUrl" type="url" className={styles.photoInput} placeholder="Paste a photo link" />
        ) : (
          <button type="button" className={styles.photoToggle} onClick={() => setShowPhoto(true)}>
            + Add a photo link
          </button>
        )}
        <button type="submit" className={styles.postBtn}>
          Post
        </button>
      </form>
    </div>
  );
}
