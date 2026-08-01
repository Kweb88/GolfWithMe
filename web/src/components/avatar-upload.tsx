"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateAvatarUrl } from "@/app/actions";
import styles from "./avatar-upload.module.css";

export function AvatarUpload({ userId, currentUrl }: { userId: string; currentUrl: string | null }) {
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      await updateAvatarUrl(url);
      setPreview(url);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setUploading(true);
    try {
      await updateAvatarUrl(null);
      setPreview(null);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className={styles.photo} />
      ) : (
        <div className={styles.photoPlaceholder}>No photo</div>
      )}
      <div className={styles.actions}>
        <button type="button" className={styles.uploadBtn} disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? "Uploading..." : "Upload Photo"}
        </button>
        {preview && (
          <button type="button" className={styles.removeBtn} disabled={uploading} onClick={handleRemove}>
            Remove
          </button>
        )}
      </div>
      {error && <div className={styles.error}>{error}</div>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className={styles.hiddenInput}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
