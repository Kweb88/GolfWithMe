"use client";

import { useEffect } from "react";
import { scoreShape } from "@/lib/scoring";
import styles from "./score-picker.module.css";

const NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1);

export function ScorePicker({
  playerName,
  hole,
  par,
  currentValue,
  onSelect,
  onClose,
}: {
  playerName: string;
  hole: number;
  par: number;
  currentValue: number | null;
  onSelect: (strokes: number | null) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <div className={styles.title}>{playerName}</div>
            <div className={styles.subtitle}>
              Hole {hole} · Par {par}
            </div>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className={styles.grid}>
          {NUMBERS.map((n) => {
            const shape = scoreShape(n, par);
            return (
              <button
                key={n}
                type="button"
                className={`${styles.numBtn} ${shape ? styles[shape] : ""} ${n === currentValue ? styles.active : ""}`}
                onClick={() => onSelect(n)}
              >
                {n}
              </button>
            );
          })}
        </div>
        {currentValue !== null && (
          <button type="button" className={styles.clearBtn} onClick={() => onSelect(null)}>
            Clear score
          </button>
        )}
      </div>
    </div>
  );
}
