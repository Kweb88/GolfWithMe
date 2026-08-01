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
