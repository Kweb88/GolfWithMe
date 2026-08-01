// Trip-wide "day after" awards, ported and extended from the prototype's
// mostBirdiesAward/biggestComebackAward/tripChampion. Match Play and Ryder
// Cup rounds are excluded (per the prototype) since raw strokes there aren't
// the point of the format; Stroke and Scramble rounds count.
export type AwardRound = { id: string; course_name: string; format: string; par: number[] };
export type RoundPlayerRow = { round_id: string; member_id: string };
export type ScoreRow = { round_id: string; member_id: string; hole: number; strokes: number | null };

export type TotalAward = { id: string; total: number };
export type BirdiesAward = { id: string; count: number };
export type ComebackAward = { id: string; improvement: number; courseName: string };
export type WorstHoleAward = { courseName: string; hole: number; overPar: number; playerCount: number };

export type TripAwards = {
  champion: TotalAward | null;
  worstGolfer: TotalAward | null;
  birdies: BirdiesAward | null;
  comeback: ComebackAward | null;
  worstHole: WorstHoleAward | null;
};

const ELIGIBLE_FORMATS = new Set(["stroke", "scramble"]);

export function computeTripAwards(
  rounds: AwardRound[],
  roundPlayers: RoundPlayerRow[],
  scores: ScoreRow[],
): TripAwards {
  const elig = rounds.filter((r) => ELIGIBLE_FORMATS.has(r.format));
  const eligIds = new Set(elig.map((r) => r.id));

  const membersByRound = new Map<string, string[]>();
  for (const rp of roundPlayers) {
    if (!eligIds.has(rp.round_id)) continue;
    if (!membersByRound.has(rp.round_id)) membersByRound.set(rp.round_id, []);
    membersByRound.get(rp.round_id)!.push(rp.member_id);
  }

  // memberId -> roundId -> 18 holes (0-indexed)
  const scoreIdx = new Map<string, Map<string, (number | null)[]>>();
  for (const s of scores) {
    if (!eligIds.has(s.round_id)) continue;
    if (!scoreIdx.has(s.member_id)) scoreIdx.set(s.member_id, new Map());
    const byRound = scoreIdx.get(s.member_id)!;
    if (!byRound.has(s.round_id)) byRound.set(s.round_id, Array(18).fill(null));
    byRound.get(s.round_id)![s.hole - 1] = s.strokes;
  }

  const totals: Record<string, number> = {};
  const birdieCounts: Record<string, number> = {};
  let comeback: ComebackAward | null = null;
  let worstHole: WorstHoleAward | null = null;

  for (const round of elig) {
    const par = round.par;
    const members = membersByRound.get(round.id) ?? [];

    for (const memberId of members) {
      const holes = scoreIdx.get(memberId)?.get(round.id) ?? Array(18).fill(null);

      if (holes.every((v) => v !== null)) {
        const total = holes.reduce<number>((sum, v) => sum + (v as number), 0);
        totals[memberId] = (totals[memberId] ?? 0) + total;
      }

      let birdies = 0;
      for (let h = 0; h < 18; h++) {
        const v = holes[h];
        if (v === null) continue;
        if (v - (par[h] ?? 4) <= -1) birdies++;
      }
      if (birdies > 0) birdieCounts[memberId] = (birdieCounts[memberId] ?? 0) + birdies;

      const front = holes.slice(0, 9);
      const back = holes.slice(9, 18);
      if (front.every((v) => v !== null) && back.every((v) => v !== null)) {
        const frontTotal = front.reduce<number>((s, v) => s + (v as number), 0);
        const backTotal = back.reduce<number>((s, v) => s + (v as number), 0);
        const improvement = frontTotal - backTotal;
        if (improvement > 0 && (!comeback || improvement > comeback.improvement)) {
          comeback = { id: memberId, improvement, courseName: round.course_name };
        }
      }
    }

    for (let h = 0; h < 18; h++) {
      let overPar = 0;
      let count = 0;
      for (const memberId of members) {
        const v = scoreIdx.get(memberId)?.get(round.id)?.[h];
        if (v === null || v === undefined) continue;
        overPar += v - (par[h] ?? 4);
        count++;
      }
      if (count >= 2 && (!worstHole || overPar > worstHole.overPar)) {
        worstHole = { courseName: round.course_name, hole: h + 1, overPar, playerCount: count };
      }
    }
  }

  const totalEntries = Object.entries(totals);
  let champion: TotalAward | null = null;
  let worstGolfer: TotalAward | null = null;
  if (totalEntries.length >= 2) {
    for (const [id, total] of totalEntries) {
      if (!champion || total < champion.total) champion = { id, total };
      if (!worstGolfer || total > worstGolfer.total) worstGolfer = { id, total };
    }
  }

  let birdies: BirdiesAward | null = null;
  for (const [id, count] of Object.entries(birdieCounts)) {
    if (!birdies || count > birdies.count) birdies = { id, count };
  }

  return { champion, worstGolfer, birdies, comeback, worstHole };
}
