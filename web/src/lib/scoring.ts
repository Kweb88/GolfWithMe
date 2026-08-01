// Traditional scorecard notation: circle a score under par (double circle for
// eagle or better), box a score over par (double box for double-bogey-plus).
export type ScoreShape = "eagle" | "birdie" | "par" | "bogey" | "double" | null;

export function scoreShape(strokes: number | null | undefined, par: number): ScoreShape {
  if (strokes === null || strokes === undefined) return null;
  const diff = strokes - par;
  if (diff <= -2) return "eagle";
  if (diff === -1) return "birdie";
  if (diff === 0) return "par";
  if (diff === 1) return "bogey";
  return "double";
}

export type Player = { id: string; name: string };
export type HoleScores = Record<string, (number | null)[]>; // memberId -> 18 holes (0-indexed)

export type SkinsHoleResult = { hole: number; winnerId: string | null; skins: number; incomplete: boolean };
export type SkinsResult = { net: Record<string, number>; holes: SkinsHoleResult[] };

// Ported from the prototype's calcSkins: a hole only pays out once every
// player has a score in; ties and incomplete holes carry the skin forward.
export function calcSkins(scores: HoleScores, players: Player[], skinsBet: number): SkinsResult {
  const net: Record<string, number> = {};
  players.forEach((p) => (net[p.id] = 0));
  const holes: SkinsHoleResult[] = [];
  let carry = 0;

  for (let h = 0; h < 18; h++) {
    const entries = players
      .map((p) => ({ id: p.id, score: (scores[p.id] ?? [])[h] }))
      .filter((e): e is { id: string; score: number } => e.score !== null && e.score !== undefined);
    carry += 1;

    if (entries.length < players.length || entries.length < 2) {
      holes.push({ hole: h + 1, winnerId: null, skins: carry, incomplete: true });
      continue;
    }
    const min = Math.min(...entries.map((e) => e.score));
    const winners = entries.filter((e) => e.score === min);
    if (winners.length === 1) {
      const w = winners[0].id;
      net[w] += skinsBet * (players.length - 1) * carry;
      players.forEach((p) => {
        if (p.id !== w) net[p.id] -= skinsBet * carry;
      });
      holes.push({ hole: h + 1, winnerId: w, skins: carry, incomplete: false });
      carry = 0;
    } else {
      holes.push({ hole: h + 1, winnerId: null, skins: carry, incomplete: false });
    }
  }

  return { net, holes };
}

function segTotal(holes: (number | null)[], start: number, end: number): number | null {
  let sum = 0;
  for (let i = start; i < end; i++) {
    const v = holes[i];
    if (v === null || v === undefined) return null;
    sum += v;
  }
  return sum;
}

export type NassauSegmentResult = { name: string; winnerId: string | null; incomplete: boolean; tie: boolean };
export type NassauResult = { net: Record<string, number>; segments: NassauSegmentResult[] };

// Ported from the prototype's calcNassau: three separate bets (front 9,
// back 9, overall), each requiring every player to have a complete segment.
export function calcNassau(scores: HoleScores, players: Player[], nassauBet: number): NassauResult {
  const net: Record<string, number> = {};
  players.forEach((p) => (net[p.id] = 0));
  const segmentDefs = [
    { name: "Front 9", start: 0, end: 9 },
    { name: "Back 9", start: 9, end: 18 },
    { name: "Overall", start: 0, end: 18 },
  ];

  const segments = segmentDefs.map((seg) => {
    const totals = players
      .map((p) => ({ id: p.id, total: segTotal(scores[p.id] ?? [], seg.start, seg.end) }))
      .filter((t): t is { id: string; total: number } => t.total !== null);

    if (totals.length < players.length || totals.length < 2) {
      return { name: seg.name, winnerId: null, incomplete: true, tie: false };
    }
    const min = Math.min(...totals.map((t) => t.total));
    const winners = totals.filter((t) => t.total === min);
    if (winners.length === 1) {
      const w = winners[0].id;
      net[w] += nassauBet * (players.length - 1);
      players.forEach((p) => {
        if (p.id !== w) net[p.id] -= nassauBet;
      });
      return { name: seg.name, winnerId: w, incomplete: false, tie: false };
    }
    return { name: seg.name, winnerId: null, incomplete: false, tie: true };
  });

  return { net, segments };
}

export type MatchHoleResult = { hole: number; winnerId: string | null; incomplete: boolean };
export type MatchPlayResult = {
  holes: MatchHoleResult[];
  diff: number; // positive = player A up
  statusText: string;
  winnerId: string | null;
  decided: boolean;
  allSquareFinal: boolean;
  holesPlayed: number;
};

// Ported from the prototype's calcMatchPlay: hole-by-hole match status with
// early-closeout detection ("3&2") and the standard "thru N" in-progress text.
export function calcMatchPlay(scores: HoleScores, aId: string, bId: string): MatchPlayResult {
  let diff = 0;
  const holes: MatchHoleResult[] = [];
  let decidedAt: { holeNum: number; upBy: number; remaining: number } | null = null;

  for (let h = 0; h < 18; h++) {
    const av = (scores[aId] ?? [])[h];
    const bv = (scores[bId] ?? [])[h];
    const holeNum = h + 1;
    const remaining = 18 - holeNum;

    if (av === null || av === undefined || bv === null || bv === undefined) {
      holes.push({ hole: holeNum, winnerId: null, incomplete: true });
      continue;
    }
    if (av < bv) {
      diff += 1;
      holes.push({ hole: holeNum, winnerId: aId, incomplete: false });
    } else if (bv < av) {
      diff -= 1;
      holes.push({ hole: holeNum, winnerId: bId, incomplete: false });
    } else {
      holes.push({ hole: holeNum, winnerId: null, incomplete: false });
    }

    // remaining > 0 matters here: a match that stays contested until the
    // 18th hole and is decided by it is "1 Up" (won on the last hole), not
    // "1&0" — the "&N" notation only applies when holes were actually left
    // unplayed, which is impossible once remaining hits 0.
    if (!decidedAt && remaining > 0 && Math.abs(diff) > remaining) {
      decidedAt = { holeNum, upBy: Math.abs(diff), remaining };
    }
  }

  const holesPlayed = holes.filter((h) => !h.incomplete).length;
  let statusText = diff === 0 ? "All Square" : `${Math.abs(diff)} Up`;
  let winnerId: string | null = null;
  let decided = false;
  let allSquareFinal = false;

  if (decidedAt) {
    winnerId = diff > 0 ? aId : bId;
    decided = true;
    statusText = `${decidedAt.upBy}&${decidedAt.remaining}`;
  } else if (holesPlayed === 18) {
    decided = true;
    if (diff === 0) {
      allSquareFinal = true;
      statusText = "Halved — All Square";
    } else {
      winnerId = diff > 0 ? aId : bId;
      statusText = `${Math.abs(diff)} Up`;
    }
  } else {
    statusText = `${diff === 0 ? "All Square" : `${Math.abs(diff)} Up`} thru ${holesPlayed}`;
  }

  return { holes, diff, statusText, winnerId, decided, allSquareFinal, holesPlayed };
}
