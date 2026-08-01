"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createFeedPost } from "@/app/actions";
import styles from "./feed-composer.module.css";

export function FeedComposer({ userId, trips }: { userId: string; trips: { id: string; name: string }[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const router = useRouter();

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Image must be under 8MB.");
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("post-photos").upload(path, file);
      if (uploadError) {
        setError(uploadError.message);
        clearPhoto();
        return;
      }
      const { data } = supabase.storage.from("post-photos").getPublicUrl(path);
      setUploadedUrl(data.publicUrl);
    } catch {
      setError("Upload failed — check your connection and try again.");
      clearPhoto();
    } finally {
      setUploading(false);
    }
  }

  function clearPhoto() {
    setPreview(null);
    setUploadedUrl(null);
  }

  return (
    <div className={styles.card}>
      <form
        ref={formRef}
        action={async (formData) => {
          setPosting(true);
          try {
            await createFeedPost(formData);
            formRef.current?.reset();
            clearPhoto();
            router.refresh();
          } finally {
            setPosting(false);
          }
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

        {preview && (
          <div className={styles.previewWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className={styles.preview} />
            {uploading && <div className={styles.uploadingBadge}>Uploading...</div>}
            <button type="button" className={styles.removePhoto} onClick={clearPhoto} aria-label="Remove photo">
              &times;
            </button>
          </div>
        )}

        <div className={styles.actionsRow}>
          <button type="button" className={styles.photoToggle} onClick={() => fileInputRef.current?.click()}>
            📷 {preview ? "Change Photo" : "Add Photo"}
          </button>
          <button type="submit" className={styles.postBtn} disabled={uploading || posting}>
            {posting ? "Posting..." : "Post"}
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <input type="hidden" name="photoUrl" value={uploadedUrl ?? ""} />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className={styles.hiddenInput}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </form>
    </div>
  );
}
