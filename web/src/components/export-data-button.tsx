"use client";

import { useState } from "react";
import { exportMyData } from "@/app/actions";
import styles from "./account-buttons.module.css";

export function ExportDataButton() {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "golfwithme-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className={styles.outlineBtn} disabled={busy} onClick={handleClick}>
      {busy ? "Preparing..." : "Download Your Data"}
    </button>
  );
}
