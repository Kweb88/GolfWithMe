"use client";

import { useState } from "react";
import styles from "@/app/page.module.css";
import teamStyles from "./round-format-fields.module.css";

type Player = { id: string; name: string };
type Format = "stroke" | "match" | "scramble" | "ryder";

export function RoundFormatFields({
  players,
  ryderTeamAName,
  ryderTeamBName,
  ryderTeamAPlayers,
  ryderTeamBPlayers,
}: {
  players: Player[];
  ryderTeamAName?: string | null;
  ryderTeamBName?: string | null;
  ryderTeamAPlayers?: Player[];
  ryderTeamBPlayers?: Player[];
}) {
  const [format, setFormat] = useState<Format>("stroke");
  const [teams, setTeams] = useState<Record<string, "a" | "b">>(() => {
    const initial: Record<string, "a" | "b"> = {};
    players.forEach((p, i) => (initial[p.id] = i % 2 === 0 ? "a" : "b"));
    return initial;
  });

  const ryderAvailable = !!(ryderTeamAPlayers?.length && ryderTeamBPlayers?.length);
  const pairCount = ryderAvailable ? Math.min(ryderTeamAPlayers!.length, ryderTeamBPlayers!.length) : 0;

  return (
    <>
      <div className={styles.row} style={{ marginTop: 10 }}>
        <div className={styles.field}>
          <label htmlFor="format">Format</label>
          <select id="format" name="format" value={format} onChange={(e) => setFormat(e.target.value as Format)}>
            <option value="stroke">Stroke Play (skins &amp; Nassau)</option>
            <option value="match">Match Play (1v1)</option>
            <option value="scramble">Scramble (teams)</option>
            {ryderAvailable && <option value="ryder">Ryder Cup Singles</option>}
          </select>
        </div>
      </div>

      {format === "stroke" && (
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
      )}

      {format === "match" && (
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

      {format === "scramble" && (
        <>
          <div className={styles.row} style={{ marginTop: 10 }}>
            <div className={styles.field}>
              <label htmlFor="teamAName">Team A name</label>
              <input id="teamAName" name="teamAName" type="text" defaultValue="Team A" />
            </div>
            <div className={styles.field}>
              <label htmlFor="teamBName">Team B name</label>
              <input id="teamBName" name="teamBName" type="text" defaultValue="Team B" />
            </div>
          </div>
          <div className={styles.field} style={{ marginTop: 10 }}>
            <label>Assign players</label>
            {players.map((p) => (
              <div key={p.id} className={teamStyles.teamRow}>
                <span className={teamStyles.teamName}>{p.name}</span>
                <div className={teamStyles.toggle}>
                  <button
                    type="button"
                    className={`${teamStyles.toggleBtn} ${teams[p.id] === "a" ? teamStyles.selected : ""}`}
                    onClick={() => setTeams((t) => ({ ...t, [p.id]: "a" }))}
                  >
                    A
                  </button>
                  <button
                    type="button"
                    className={`${teamStyles.toggleBtn} ${teams[p.id] === "b" ? teamStyles.selected : ""}`}
                    onClick={() => setTeams((t) => ({ ...t, [p.id]: "b" }))}
                  >
                    B
                  </button>
                </div>
                <input type="hidden" name={`team_${p.id}`} value={teams[p.id] ?? "a"} />
              </div>
            ))}
          </div>
        </>
      )}

      {format === "ryder" && ryderAvailable && (
        <div className={styles.hint} style={{ marginTop: 10 }}>
          Ryder Cup singles pairings are generated automatically — each {ryderTeamAName} player faces a{" "}
          {ryderTeamBName} player: {pairCount} pair{pairCount === 1 ? "" : "s"} this round.
        </div>
      )}
    </>
  );
}
