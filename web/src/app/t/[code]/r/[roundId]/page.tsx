import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { ScorecardGrid } from "@/components/scorecard-grid";
import { calcSkins, calcNassau } from "@/lib/scoring";
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
    .select("id, code, name")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (!trip) notFound();

  const { data: round } = await supabase
    .from("rounds")
    .select("id, course_name, course_location, round_date, skins_bet, nassau_bet, par")
    .eq("id", roundId)
    .eq("trip_id", trip.id)
    .maybeSingle();
  if (!round) notFound();

  const [{ data: members }, { data: scoreRows }] = await Promise.all([
    supabase.from("trip_members").select("id, name").eq("trip_id", trip.id).order("joined_at"),
    supabase.from("scores").select("member_id, hole, strokes").eq("round_id", round.id),
  ]);

  const players = members ?? [];
  const par = round.par as number[];

  const scores: Record<string, (number | null)[]> = {};
  for (const p of players) scores[p.id] = new Array(18).fill(null);
  for (const row of scoreRows ?? []) {
    if (!scores[row.member_id]) scores[row.member_id] = new Array(18).fill(null);
    scores[row.member_id][row.hole - 1] = row.strokes;
  }

  const leaderboard = players
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

  const skins = round.skins_bet > 0 && players.length >= 2 ? calcSkins(scores, players, round.skins_bet) : null;
  const skinsWon = skins ? skins.holes.filter((h) => h.winnerId !== null).length : 0;
  const nassau = round.nassau_bet > 0 && players.length >= 2 ? calcNassau(scores, players, round.nassau_bet) : null;

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
            {round.skins_bet > 0 ? `Skins: $${round.skins_bet}/hole` : ""}
            {round.skins_bet > 0 && round.nassau_bet > 0 ? " · " : ""}
            {round.nassau_bet > 0 ? `Nassau: $${round.nassau_bet}/segment` : ""}
          </div>
        </div>

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
                {players.map((p) => (
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
                {players.map((p) => (
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
          <ScorecardGrid roundId={round.id} par={par} players={players} initialScores={scores} />
        </div>
      </main>
      <BottomNav active="trips" />
    </>
  );
}
