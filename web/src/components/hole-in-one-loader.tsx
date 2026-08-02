import styles from "./hole-in-one-loader.module.css";

// fill: use when embedding inside a fixed-size container (e.g. a device
// mock-up) instead of as a real full-page loading screen — 100dvh reflects
// the actual browser viewport, not this component's containing box, so it
// would blow past a smaller parent and center itself off-screen.
export function HoleInOneLoader({ fill = false }: { fill?: boolean } = {}) {
  return (
    <div className={styles.screen} style={fill ? { minHeight: "100%", height: "100%" } : undefined}>
      <div className={styles.scene}>
        <div className={styles.ground} />
        <div className={styles.tee} />
        <div className={styles.pin}>
          <div className={styles.flagpole} />
          <div className={styles.flag} />
        </div>
        <div className={styles.hole} />
        <div className={styles.ring} />
        <div className={styles.ball} />
      </div>
      <div className={styles.wordmark}>
        Golf<span className={styles.with}>With</span>Me
      </div>
      <div className={styles.caption}>Teeing up...</div>
    </div>
  );
}
