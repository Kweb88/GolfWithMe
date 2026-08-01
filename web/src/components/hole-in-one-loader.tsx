import styles from "./hole-in-one-loader.module.css";

export function HoleInOneLoader() {
  return (
    <div className={styles.screen}>
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
