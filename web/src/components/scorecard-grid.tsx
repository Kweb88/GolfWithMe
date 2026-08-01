"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateScore } from "@/app/actions";
import { ScorePicker } from "@/components/score-picker";
import { scoreShape } from "@/lib/scoring";
import styles from "./scorecard-grid.module.css";

type Player = { id: string; name: string };
type Scores = Record<string, (number | null)[]>; // memberId -> 18 holes (0-indexed)
type ActiveCell = { memberId: string; memberName: string; hole: number } | null; // hole is 1-indexed

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
  const [active, setActive] = useState<ActiveCell>(null);
  const router = useRouter();

  function holesFor(memberId: string) {
    return scores[memberId] ?? new Array(18).fill(null);
  }

  async function selectScore(strokes: number | null) {
    if (!active) return;
    const { memberId, hole } = active;
    setScores((prev) => {
      const next = { ...prev, [memberId]: [...(prev[memberId] ?? new Array(18).fill(null))] };
      next[memberId][hole - 1] = strokes;
      return next;
    });
    setActive(null);
    await updateScore(roundId, memberId, hole, strokes);
    router.refresh();
  }

  const parOut = segTotal(par, 0, 9);
  const parIn = segTotal(par, 9, 18);
  const parTotal = segTotal(par, 0, 18);

  function renderHoleCell(player: Player, holeIndex: number, isDivider: boolean) {
    const value = holesFor(player.id)[holeIndex] ?? null;
    const shape = scoreShape(value, par[holeIndex]);
    return (
      <td key={holeIndex} className={isDivider ? `${styles.holecell} ${styles.divider9}` : styles.holecell}>
        <button
          type="button"
          className={`${styles.scoreBtn} ${shape ? styles[shape] : styles.empty}`}
          onClick={() => setActive({ memberId: player.id, memberName: player.name, hole: holeIndex + 1 })}
          aria-label={`${player.name} hole ${holeIndex + 1}, par ${par[holeIndex]}${value ? `, score ${value}` : ", no score yet"}`}
        >
          {value ?? ""}
        </button>
      </td>
    );
  }

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
                {Array.from({ length: 9 }, (_, i) => renderHoleCell(player, i, i === 8))}
                <td className={styles.totalcol}>{out ?? "–"}</td>
                {Array.from({ length: 9 }, (_, i) => renderHoleCell(player, i + 9, false))}
                <td className={styles.totalcol}>{inn ?? "–"}</td>
                <td className={styles.totalcol}>{total ?? "–"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className={styles.legend}>
        <span className={`${styles.legendShape} ${styles.eagle}`} /> Eagle+
        <span className={`${styles.legendShape} ${styles.birdie}`} /> Birdie
        <span className={`${styles.legendShape} ${styles.par}`} /> Par
        <span className={`${styles.legendShape} ${styles.bogey}`} /> Bogey
        <span className={`${styles.legendShape} ${styles.double}`} /> Double+
      </div>
      {active && (
        <ScorePicker
          playerName={active.memberName}
          hole={active.hole}
          par={par[active.hole - 1]}
          currentValue={holesFor(active.memberId)[active.hole - 1] ?? null}
          onSelect={selectScore}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}
