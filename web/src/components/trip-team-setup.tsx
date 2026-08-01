"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setTripTeams } from "@/app/actions";
import pageStyles from "@/app/t/[code]/page.module.css";
import teamStyles from "./round-format-fields.module.css";

type Player = { id: string; name: string; team: "a" | "b" | null };

export function TripTeamSetup({
  tripId,
  players,
  teamAName,
  teamBName,
}: {
  tripId: string;
  players: Player[];
  teamAName: string | null;
  teamBName: string | null;
}) {
  const [editing, setEditing] = useState(!teamAName);
  const [teams, setTeams] = useState<Record<string, "a" | "b">>(() => {
    const initial: Record<string, "a" | "b"> = {};
    players.forEach((p, i) => (initial[p.id] = p.team ?? (i % 2 === 0 ? "a" : "b")));
    return initial;
  });
  const setTripTeamsForTrip = setTripTeams.bind(null, tripId);
  const router = useRouter();

  if (!editing) {
    const aNames = players.filter((p) => (p.team ?? "a") === "a").map((p) => p.name);
    const bNames = players.filter((p) => p.team === "b").map((p) => p.name);
    return (
      <div>
        <div className={pageStyles.hint} style={{ margin: 0 }}>
          <b>{teamAName}</b>: {aNames.join(", ") || "—"}
        </div>
        <div className={pageStyles.hint}>
          <b>{teamBName}</b>: {bNames.join(", ") || "—"}
        </div>
        <button type="button" className={pageStyles.btn} onClick={() => setEditing(true)}>
          Edit Teams
        </button>
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        await setTripTeamsForTrip(formData);
        setEditing(false);
        router.refresh();
      }}
    >
      <div className={pageStyles.row}>
        <div className={pageStyles.field}>
          <label htmlFor="teamAName">Team A name</label>
          <input id="teamAName" name="teamAName" type="text" defaultValue={teamAName ?? "Team A"} />
        </div>
        <div className={pageStyles.field}>
          <label htmlFor="teamBName">Team B name</label>
          <input id="teamBName" name="teamBName" type="text" defaultValue={teamBName ?? "Team B"} />
        </div>
      </div>
      <div className={pageStyles.field} style={{ marginTop: 10 }}>
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
      <button type="submit" className={pageStyles.btn}>
        Save Teams
      </button>
    </form>
  );
}
