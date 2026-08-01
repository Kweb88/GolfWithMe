import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { ScorecardGrid } from "@/components/scorecard-grid";
import { calcSkins, calcNassau, calcMatchPlay } from "@/lib/scoring";
import styles from "./page.module.css";

function fmt(n: number) {
  return (n < 0 ? "-$" : "$") + Math.abs(n).toFixed(2);
}

function amtClass(n: number) {
  if (n > 0) return styles.amtPos;
  if (n < 0) return styles.amtNeg;
  return styles.amtZero;
}

export default async function RoundPage({
  params,
}: {
  params: Promise<{ code: string; roundId: string }>;
}) {
  const { code, roundId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: trip } = await supabase
    .from("trips")
    .select("id, code, name, team_a_name, team_b_name")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (!trip) notFound();

  const { data: round } = await supabase
    .from("rounds")
    .select(
      "id, course_name, course_location, round_date, format, skins_bet, nassau_bet, match_player_a, match_player_b, team_a_name, team_b_name, par",
    )
    .eq("id", roundId)
    .eq("trip_id", trip.id)
    .maybeSingle();
  if (!round) notFound();

  const [{ data: members }, { data: scoreRows }, { data: roundPlayers }, { data: pairRows }] = await Promise.all([
    supabase.from("trip_members").select("id, name").eq("trip_id", trip.id).order("joined_at"),
    supabase.from("scores").select("member_id, hole, strokes").eq("round_id", round.id),
    supabase.from("round_players").select("member_id, team").eq("round_id", round.id),
    supabase.from("round_ryder_pairs").select("id, member_a, member_b").eq("round_id", round.id),
  ]);

  const players = members ?? [];
  const par = round.par as number[];
  const isMatch = round.format === "match";
  const isScramble = round.format === "scramble";
  const isRyder = round.format === "ryder";

  const scores: Record<string, (number | null)[]> = {};
  for (const p of players) scores[p.id] = new Array(18).fill(null);
  for (const row of scoreRows ?? []) {
    if (!scores[row.member_id]) scores[row.member_id] = new Array(18).fill(null);
    scores[row.member_id][row.hole - 1] = row.strokes;
  }

  // Scope stroke-format leaderboard/skins/Nassau/scorecard to whoever was
  // actually snapshotted into this round at creation time — not every
  // *current* trip member. Otherwise a player who joins the trip later
  // shows up with no scores in old rounds, and since skins/Nassau only pay
  // out once every listed player has a complete hole, that silently breaks
  // payouts for every hole of every round that predates them.
  const roundPlayerIds = new Set((roundPlayers ?? []).map((rp) => rp.member_id));
  const strokePlayers = players.filter((p) => roundPlayerIds.has(p.id));

  const playerA = players.find((p) => p.id === round.match_player_a);
  const playerB = players.find((p) => p.id === round.match_player_b);
  const match = isMatch && playerA && playerB ? calcMatchPlay(scores, playerA.id, playerB.id) : null;

  const teamAIds = (roundPlayers ?? []).filter((rp) => rp.team === "a").map((rp) => rp.member_id);
  const teamBIds = (roundPlayers ?? []).filter((rp) => rp.team === "b").map((rp) => rp.member_id);
  const teamMemberIds: Record<string, string[]> = { a: teamAIds, b: teamBIds };
  const teamScores: Record<string, (number | null)[]> = {
    a: teamAIds.length ? (scores[teamAIds[0]] ?? new Array(18).fill(null)) : new Array(18).fill(null),
    b: teamBIds.length ? (scores[teamBIds[0]] ?? new Array(18).fill(null)) : new Array(18).fill(null),
  };
  const teamRows = [
    { id: "a", name: round.team_a_name ?? "Team A" },
    { id: "b", name: round.team_b_name ?? "Team B" },
  ];
  const teamTotals = teamRows.map((t) => {
    const holes = teamScores[t.id];
    let strokes = 0;
    let thru = 0;
    for (let i = 0; i < 18; i++) {
      const v = holes[i];
      if (v !== null && v !== undefined) {
        strokes += v;
        thru++;
      }
    }
    return { ...t, strokes, thru };
  });

  const scorecardPlayers = isMatch
    ? [playerA, playerB].filter((p): p is { id: string; name: string } => !!p)
    : isScramble
      ? teamRows
      : strokePlayers;

  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "?";
  const ryderMatches = (pairRows ?? []).map((pr) => ({
    id: pr.id,
    aId: pr.member_a,
    bId: pr.member_b,
    aName: nameOf(pr.member_a),
    bName: nameOf(pr.member_b),
    match: calcMatchPlay(scores, pr.member_a, pr.member_b),
  }));
  let ryderPtsA = 0;
  let ryderPtsB = 0;
  for (const m of ryderMatches) {
    if (m.match.winnerId === m.aId) ryderPtsA += 1;
    else if (m.match.winnerId === m.bId) ryderPtsB += 1;
    else if (m.match.allSquareFinal) {
      ryderPtsA += 0.5;
      ryderPtsB += 0.5;
    }
  }

  const leaderboard = strokePlayers
    .map((p) => {
      const holes = scores[p.id] ?? [];
      let strokes = 0;
      let thru = 0;
      let parSum = 0;
      for (let i = 0; i < 18; i++) {
        const v = holes[i];
        if (v !== null && v !== undefined) {
          strokes += v;
          parSum += par[i] ?? 4;
          thru++;
        }
      }
      const diff = thru ? strokes - parSum : null;
      return { id: p.id, name: p.name, strokes, thru, diff };
    })
    .filter((r) => r.thru > 0)
    .sort((a, b) => (a.diff! - b.diff!) || b.thru - a.thru);

  const skins =
    round.skins_bet > 0 && strokePlayers.length >= 2 ? calcSkins(scores, strokePlayers, round.skins_bet) : null;
  const skinsWon = skins ? skins.holes.filter((h) => h.winnerId !== null).length : 0;
  const nassau =
    round.nassau_bet > 0 && strokePlayers.length >= 2 ? calcNassau(scores, strokePlayers, round.nassau_bet) : null;

  return (
    <>
      <AppHeader tripCode={trip.code} />
      <main className={styles.main}>
        <div className={styles.card}>
          <h3>{round.course_name}</h3>
          <div className={styles.hint}>
            {round.course_location}
            {round.round_date ? ` · ${round.round_date}` : ""}
          </div>
          <div className={styles.hint}>
            {isMatch ? "Match Play" : isScramble ? "Scramble" : isRyder ? "Ryder Cup Singles" : (
              <>
                {round.skins_bet > 0 ? `Skins: $${round.skins_bet}/hole` : ""}
                {round.skins_bet > 0 && round.nassau_bet > 0 ? " · " : ""}
                {round.nassau_bet > 0 ? `Nassau: $${round.nassau_bet}/segment` : ""}
              </>
            )}
          </div>
        </div>

        {isRyder && (
          <div className={styles.card}>
            <h3>Ryder Cup</h3>
            <div className={styles.matchStatus}>
              <span className={styles.matchName}>
                {trip.team_a_name ?? "Team A"} {ryderPtsA}
              </span>
              <span className={styles.matchStatusText}>vs</span>
              <span className={styles.matchName}>
                {ryderPtsB} {trip.team_b_name ?? "Team B"}
              </span>
            </div>
            {ryderMatches.map((m) => (
              <div key={m.id} className={styles.segmentRow}>
                <span>
                  {m.aName} vs {m.bName}
                </span>
                <span className={styles.segmentWinner}>{m.match.statusText}</span>
              </div>
            ))}
          </div>
        )}

        {isScramble && (
          <div className={styles.card}>
            <h3>Team Leaderboard</h3>
            <table className={styles.leaderboard}>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Thru</th>
                  <th>Strokes</th>
                </tr>
              </thead>
              <tbody>
                {[...teamTotals]
                  .sort((a, b) => (b.thru > 0 && a.thru > 0 ? a.strokes - b.strokes : b.thru - a.thru))
                  .map((t) => (
                    <tr key={t.id}>
                      <td>{t.name}</td>
                      <td className="mono">{t.thru}</td>
                      <td className="mono">{t.thru > 0 ? t.strokes : "–"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {isMatch && match && playerA && playerB && (
          <div className={styles.card}>
            <h3>Match Status</h3>
            <div className={styles.matchStatus}>
              <span className={styles.matchName}>{playerA.name}</span>
              <span className={styles.matchStatusText}>{match.statusText}</span>
              <span className={styles.matchName}>{playerB.name}</span>
            </div>
            <div className={styles.hint}>
              {match.decided ? "Match complete." : `${match.holesPlayed} of 18 holes played.`}
            </div>
          </div>
        )}

        {!isMatch && !isScramble && !isRyder && (
          <div className={styles.card}>
            <h3>Leaderboard</h3>
            {leaderboard.length ? (
              <table className={styles.leaderboard}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Player</th>
                    <th>Thru</th>
                    <th>Strokes</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((r, i) => (
                    <tr key={r.id}>
                      <td className={styles.rank}>{i + 1}</td>
                      <td>{r.name}</td>
                      <td className="mono">{r.thru}</td>
                      <td className="mono">{r.strokes}</td>
                      <td className={`${styles.score} ${r.diff! < 0 ? styles.under : r.diff! > 0 ? styles.over : ""}`}>
                        {r.diff === 0 ? "E" : `${r.diff! > 0 ? "+" : ""}${r.diff}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.hint}>Leaderboard appears once scores are entered.</div>
            )}
          </div>
        )}

        {skins && (
          <div className={styles.card}>
            <h3>Skins (${round.skins_bet}/hole)</h3>
            <div className={styles.hint}>
              {skinsWon} of 18 holes decided{skinsWon < 18 ? " so far" : ""}.
            </div>
            <table className={styles.leaderboard}>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {strokePlayers.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className={`${styles.amt} ${amtClass(skins.net[p.id])}`}>{fmt(skins.net[p.id])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {nassau && (
          <div className={styles.card}>
            <h3>Nassau (${round.nassau_bet}/segment)</h3>
            {nassau.segments.map((seg) => (
              <div key={seg.name} className={styles.segmentRow}>
                <span>{seg.name}</span>
                <span className={styles.segmentWinner}>
                  {seg.incomplete
                    ? "In progress"
                    : seg.tie
                      ? "Tied — no payout"
                      : players.find((p) => p.id === seg.winnerId)?.name}
                </span>
              </div>
            ))}
            <table className={styles.leaderboard} style={{ marginTop: 10 }}>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {strokePlayers.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className={`${styles.amt} ${amtClass(nassau.net[p.id])}`}>{fmt(nassau.net[p.id])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.card}>
          <h3>Scorecard</h3>
          <ScorecardGrid
            roundId={round.id}
            par={par}
            players={scorecardPlayers}
            initialScores={isScramble ? teamScores : scores}
            teamMemberIds={isScramble ? teamMemberIds : undefined}
          />
        </div>
      </main>
      <BottomNav active="trips" />
    </>
  );
}
