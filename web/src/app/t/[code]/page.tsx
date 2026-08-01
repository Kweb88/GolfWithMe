import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { TripTeamSetup } from "@/components/trip-team-setup";
import { SettleUp } from "@/components/settle-up";
import { computeTripBetBalances } from "@/lib/settle-up";
import { simplifyDebts } from "@/lib/money";
import { addPlayer } from "../../actions";
import styles from "./page.module.css";

export default async function TripPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: trip } = await supabase
    .from("trips")
    .select("id, code, name, location, start_date, end_date, team_a_name, team_b_name")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (!trip) {
    return (
      <>
        <AppHeader />
        <main className={styles.main}>
          <div className={styles.notFound}>
            <p>No trip found for code {code.toUpperCase()}.</p>
          </div>
        </main>
        <BottomNav active="trips" />
      </>
    );
  }

  const [{ data: players }, { data: membership }, { data: rounds }] = await Promise.all([
    supabase
      .from("trip_members")
      .select("id, name, venmo, cashapp, zelle, team")
      .eq("trip_id", trip.id)
      .order("joined_at", { ascending: true }),
    supabase
      .from("trip_members")
      .select("id")
      .eq("trip_id", trip.id)
      .eq("profile_id", data.user.id)
      .maybeSingle(),
    supabase
      .from("rounds")
      .select("id, course_name, round_date")
      .eq("trip_id", trip.id)
      .order("created_at", { ascending: false }),
  ]);

  const isMember = !!membership;
  const addPlayerForTrip = addPlayer.bind(null, trip.id);

  const { data: strokeRounds } = await supabase
    .from("rounds")
    .select("id, skins_bet, nassau_bet")
    .eq("trip_id", trip.id)
    .eq("format", "stroke");

  let debts: { from: string; to: string; amount: number }[] = [];
  if (strokeRounds && strokeRounds.length > 0 && players && players.length > 0) {
    const roundIds = strokeRounds.map((r) => r.id);
    const [{ data: roundPlayers }, { data: scores }] = await Promise.all([
      supabase.from("round_players").select("round_id, member_id").in("round_id", roundIds),
      supabase.from("scores").select("round_id, member_id, hole, strokes").in("round_id", roundIds),
    ]);
    const balances = computeTripBetBalances(strokeRounds, roundPlayers ?? [], scores ?? [], players);
    debts = simplifyDebts(balances);
  }
  const playersById = new Map((players ?? []).map((p) => [p.id, p]));

  return (
    <>
      <AppHeader tripCode={trip.code} />
      <main className={styles.main}>
        <div className={styles.card}>
          <h3>{trip.name}</h3>
          <div className={styles.hint}>
            {trip.location}
            {trip.start_date ? ` · ${trip.start_date}` : ""}
            {trip.end_date ? ` – ${trip.end_date}` : ""}
          </div>
          <div className={styles.hint}>
            Share code <b>{trip.code}</b> — anyone who joins sees and edits the same live trip.
          </div>
        </div>

        <div className={styles.card}>
          <h3>Players</h3>
          {players && players.length > 0 ? (
            players.map((p) => (
              <div key={p.id} className={styles.playerRow}>
                <span className={styles.playerName}>{p.name}</span>
                <span className={styles.playerContact}>
                  {p.venmo ? `@${p.venmo}` : "no venmo"}
                  {p.cashapp ? ` · $${p.cashapp}` : ""}
                  {p.zelle ? ` · ${p.zelle}` : ""}
                </span>
              </div>
            ))
          ) : (
            <div className={styles.emptyMini}>No players yet.</div>
          )}
        </div>

        <div className={styles.card}>
          <h3>Rounds</h3>
          {rounds && rounds.length > 0 ? (
            rounds.map((r) => (
              <Link key={r.id} href={`/t/${trip.code}/r/${r.id}`} className={styles.roundRow}>
                <span className={styles.playerName}>{r.course_name}</span>
                <span className={styles.playerContact}>{r.round_date ?? ""}</span>
              </Link>
            ))
          ) : (
            <div className={styles.emptyMini}>No rounds logged yet.</div>
          )}
          {isMember && (
            <Link href={`/t/${trip.code}/rounds/new`} className={styles.btn} style={{ display: "inline-block", textDecoration: "none" }}>
              + Log a Round
            </Link>
          )}
        </div>

        {debts.length > 0 && (
          <div className={styles.card}>
            <h3>Settle Up</h3>
            <div className={styles.hint} style={{ marginTop: -8, marginBottom: 10 }}>
              Net skins &amp; Nassau winnings across every round this trip.
            </div>
            <SettleUp
              debts={debts.map((d) => ({
                fromName: playersById.get(d.from)?.name ?? "Someone",
                toName: playersById.get(d.to)?.name ?? "Someone",
                amount: d.amount,
                toVenmo: playersById.get(d.to)?.venmo ?? null,
                toCashapp: playersById.get(d.to)?.cashapp ?? null,
              }))}
              tripName={trip.name}
            />
          </div>
        )}

        {isMember && players && players.length >= 2 && (
          <div className={styles.card}>
            <h3>Ryder Cup Teams</h3>
            <TripTeamSetup
              tripId={trip.id}
              players={players.map((p) => ({ id: p.id, name: p.name, team: p.team }))}
              teamAName={trip.team_a_name}
              teamBName={trip.team_b_name}
            />
          </div>
        )}

        {isMember && (
          <div className={styles.card}>
            <h3>Add a Player</h3>
            <form action={addPlayerForTrip}>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="name">Name</label>
                  <input id="name" name="name" type="text" required />
                </div>
                <div className={styles.field}>
                  <label htmlFor="venmo">Venmo</label>
                  <input id="venmo" name="venmo" type="text" placeholder="username" />
                </div>
                <div className={styles.field}>
                  <label htmlFor="cashapp">Cash App</label>
                  <input id="cashapp" name="cashapp" type="text" placeholder="cashtag" />
                </div>
              </div>
              <button type="submit" className={styles.btn}>
                Add Player
              </button>
            </form>
          </div>
        )}
      </main>
      <BottomNav active="trips" />
    </>
  );
}
