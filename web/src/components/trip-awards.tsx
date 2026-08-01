import styles from "./trip-awards.module.css";

type NamedTotal = { name: string; total: number };
type NamedCount = { name: string; count: number };
type NamedComeback = { name: string; improvement: number; courseName: string };
type WorstHole = { hole: number; overPar: number; courseName: string };

export function TripAwards({
  champion,
  worstGolfer,
  birdies,
  comeback,
  worstHole,
}: {
  champion: NamedTotal | null;
  worstGolfer: NamedTotal | null;
  birdies: NamedCount | null;
  comeback: NamedComeback | null;
  worstHole: WorstHole | null;
}) {
  const hasAny = champion || worstGolfer || birdies || comeback || worstHole;

  if (!hasAny) {
    return <div className={styles.empty}>Awards fill in as rounds get played.</div>;
  }

  return (
    <div className={styles.list}>
      {champion && (
        <div className={styles.row}>
          <div className={styles.icon}>🏆</div>
          <div className={styles.text}>
            <div className={styles.label}>Trip Champion</div>
            <div className={styles.sub}>Lowest total strokes across complete rounds</div>
          </div>
          <div className={styles.value}>
            {champion.name} <span className={styles.detail}>({champion.total})</span>
          </div>
        </div>
      )}
      {birdies && (
        <div className={styles.row}>
          <div className={styles.icon}>🎯</div>
          <div className={styles.text}>
            <div className={styles.label}>Most Birdies</div>
            <div className={styles.sub}>Birdie or better, counted across the trip</div>
          </div>
          <div className={styles.value}>
            {birdies.name} <span className={styles.detail}>({birdies.count})</span>
          </div>
        </div>
      )}
      {comeback && (
        <div className={styles.row}>
          <div className={styles.icon}>🔄</div>
          <div className={styles.text}>
            <div className={styles.label}>Biggest Comeback</div>
            <div className={styles.sub}>Best back-9 improvement over the front 9 · {comeback.courseName}</div>
          </div>
          <div className={styles.value}>
            {comeback.name} <span className={styles.detail}>(+{comeback.improvement})</span>
          </div>
        </div>
      )}
      {worstHole && (
        <div className={styles.row}>
          <div className={styles.icon}>💥</div>
          <div className={styles.text}>
            <div className={styles.label}>Worst Hole</div>
            <div className={styles.sub}>
              Hole {worstHole.hole} at {worstHole.courseName} · the group combined for +{worstHole.overPar}
            </div>
          </div>
          <div className={styles.value}>Hole {worstHole.hole}</div>
        </div>
      )}
      {worstGolfer && (
        <div className={styles.row}>
          <div className={styles.icon}>🫠</div>
          <div className={styles.text}>
            <div className={styles.label}>Worst Golfer</div>
            <div className={styles.sub}>Highest total strokes across complete rounds</div>
          </div>
          <div className={styles.value}>
            {worstGolfer.name} <span className={styles.detail}>({worstGolfer.total})</span>
          </div>
        </div>
      )}
    </div>
  );
}
