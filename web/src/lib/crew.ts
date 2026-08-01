// Ported from the prototype's crewStats: how many trips you've shared with
// each other player, ranked — "who do you actually golf with."
export type CrewEntry = { name: string; count: number };

export function computeCrew(myName: string, membersAcrossMyTrips: { name: string }[]): CrewEntry[] {
  const counts = new Map<string, number>();
  for (const m of membersAcrossMyTrips) {
    if (m.name === myName) continue;
    counts.set(m.name, (counts.get(m.name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}
