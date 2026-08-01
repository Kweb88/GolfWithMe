"use client";

import { useState } from "react";
import styles from "@/app/page.module.css";

type Player = { id: string; name: string };

export function RoundFormatFields({ players }: { players: Player[] }) {
  const [format, setFormat] = useState<"stroke" | "match">("stroke");

  return (
    <>
      <div className={styles.row} style={{ marginTop: 10 }}>
        <div className={styles.field}>
          <label htmlFor="format">Format</label>
          <select id="format" name="format" value={format} onChange={(e) => setFormat(e.target.value as "stroke" | "match")}>
            <option value="stroke">Stroke Play (skins &amp; Nassau)</option>
            <option value="match">Match Play (1v1)</option>
          </select>
        </div>
      </div>

      {format === "stroke" ? (
        <div className={styles.row} style={{ marginTop: 10 }}>
          <div className={styles.field}>
            <label htmlFor="skinsBet">Skins bet ($/hole)</label>
            <input id="skinsBet" name="skinsBet" type="number" min="0" step="0.5" defaultValue="2" />
          </div>
          <div className={styles.field}>
            <label htmlFor="nassauBet">Nassau bet ($/segment)</label>
            <input id="nassauBet" name="nassauBet" type="number" min="0" step="1" defaultValue="10" />
          </div>
        </div>
      ) : (
        <div className={styles.row} style={{ marginTop: 10 }}>
          <div className={styles.field}>
            <label htmlFor="matchPlayerA">Player A</label>
            <select id="matchPlayerA" name="matchPlayerA" defaultValue={players[0]?.id}>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="matchPlayerB">Player B</label>
            <select id="matchPlayerB" name="matchPlayerB" defaultValue={players[1]?.id ?? players[0]?.id}>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </>
  );
}
