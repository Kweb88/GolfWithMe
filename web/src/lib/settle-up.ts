import { calcNassau, calcSkins, type HoleScores, type Player } from "@/lib/scoring";

export type StrokeRound = { id: string; skins_bet: number; nassau_bet: number };
export type RoundPlayerRow = { round_id: string; member_id: string };
export type ScoreRow = { round_id: string; member_id: string; hole: number; strokes: number | null };

// Sums skins + Nassau net winnings across every stroke-play round in a trip,
// scoping each round to its own round_players snapshot (not the full current
// trip roster) so results stay correct even after the roster changes.
export function computeTripBetBalances(
  rounds: StrokeRound[],
  roundPlayers: RoundPlayerRow[],
  scores: ScoreRow[],
  players: Player[],
): Record<string, number> {
  const balances: Record<string, number> = {};
  players.forEach((p) => (balances[p.id] = 0));

  for (const round of rounds) {
    const memberIds = new Set(
      roundPlayers.filter((rp) => rp.round_id === round.id).map((rp) => rp.member_id),
    );
    const roundPlayersList = players.filter((p) => memberIds.has(p.id));
    if (roundPlayersList.length < 2) continue;

    const holeScores: HoleScores = {};
    roundPlayersList.forEach((p) => (holeScores[p.id] = Array(18).fill(null)));
    for (const s of scores) {
      if (s.round_id !== round.id) continue;
      if (!holeScores[s.member_id]) continue;
      holeScores[s.member_id][s.hole - 1] = s.strokes;
    }

    if (round.skins_bet > 0) {
      const { net } = calcSkins(holeScores, roundPlayersList, round.skins_bet);
      for (const [id, amt] of Object.entries(net)) balances[id] = (balances[id] ?? 0) + amt;
    }
    if (round.nassau_bet > 0) {
      const { net } = calcNassau(holeScores, roundPlayersList, round.nassau_bet);
      for (const [id, amt] of Object.entries(net)) balances[id] = (balances[id] ?? 0) + amt;
    }
  }

  return balances;
}
