"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateScore } from "@/app/actions";
import styles from "./scorecard-grid.module.css";

type Player = { id: string; name: string };
type Scores = Record<string, (number | null)[]>; // memberId -> 18 holes (0-indexed)

function segTotal(holes: (number | null)[], start: number, end: number) {
  let sum = 0;
  for (let i = start; i < end; i++) {
    const v = holes[i];
    if (v === null || v === undefined) return null;
    sum += v;
  }
  return sum;
}

export function ScorecardGrid({
  roundId,
  par,
  players,
  initialScores,
}: {
  roundId: string;
  par: number[];
  players: Player[];
  initialScores: Scores;
}) {
  const [scores, setScores] = useState<Scores>(initialScores);
  const router = useRouter();

  function holesFor(memberId: string) {
    return scores[memberId] ?? new Array(18).fill(null);
  }

  async function onCellBlur(memberId: string, hole: number, raw: string) {
    const trimmed = raw.trim();
    const strokes = trimmed === "" ? null : Number(trimmed);
    if (strokes !== null && (!Number.isInteger(strokes) || strokes < 1 || strokes > 20)) return;

    setScores((prev) => {
      const next = { ...prev, [memberId]: [...(prev[memberId] ?? new Array(18).fill(null))] };
      next[memberId][hole] = strokes;
      return next;
    });
    await updateScore(roundId, memberId, hole + 1, strokes);
    router.refresh();
  }

  const parOut = segTotal(par.map((p) => p), 0, 9);
  const parIn = segTotal(par, 9, 18);
  const parTotal = segTotal(par, 0, 18);

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className="rowlabel" style={{ textAlign: "left", paddingLeft: 10 }}>
              Player
            </th>
            {Array.from({ length: 9 }, (_, i) => (
              <th key={i}>{i + 1}</th>
            ))}
            <th>OUT</th>
            {Array.from({ length: 9 }, (_, i) => (
              <th key={i + 9}>{i + 10}</th>
            ))}
            <th>IN</th>
            <th>TOT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={`${styles.rowlabel} ${styles.parrow}`}>Par</td>
            {par.slice(0, 9).map((p, i) => (
              <td key={i} className={i === 8 ? `${styles.holecell} ${styles.divider9} ${styles.parrow}` : `${styles.holecell} ${styles.parrow}`}>
                {p}
              </td>
            ))}
            <td className={styles.totalcol}>{parOut}</td>
            {par.slice(9, 18).map((p, i) => (
              <td key={i} className={`${styles.holecell} ${styles.parrow}`}>
                {p}
              </td>
            ))}
            <td className={styles.totalcol}>{parIn}</td>
            <td className={styles.totalcol}>{parTotal}</td>
          </tr>
          {players.map((player) => {
            const holes = holesFor(player.id);
            const out = segTotal(holes, 0, 9);
            const inn = segTotal(holes, 9, 18);
            const total = segTotal(holes, 0, 18);
            return (
              <tr key={player.id}>
                <td className={styles.rowlabel}>{player.name}</td>
                {holes.slice(0, 9).map((v, i) => (
                  <td key={i} className={i === 8 ? `${styles.holecell} ${styles.divider9}` : styles.holecell}>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      defaultValue={v ?? ""}
                      onBlur={(e) => onCellBlur(player.id, i, e.target.value)}
                      aria-label={`${player.name} hole ${i + 1}`}
                    />
                  </td>
                ))}
                <td className={styles.totalcol}>{out ?? "–"}</td>
                {holes.slice(9, 18).map((v, i) => (
                  <td key={i + 9} className={styles.holecell}>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      defaultValue={v ?? ""}
                      onBlur={(e) => onCellBlur(player.id, i + 9, e.target.value)}
                      aria-label={`${player.name} hole ${i + 10}`}
                    />
                  </td>
                ))}
                <td className={styles.totalcol}>{inn ?? "–"}</td>
                <td className={styles.totalcol}>{total ?? "–"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
