"use client";

import { useEffect, useState } from "react";
import { HoleInOneLoader } from "./hole-in-one-loader";
import styles from "./app-splash.module.css";

// Slightly longer than the loader's own 4s animation cycle, so the ball
// actually completes its flight and drops in before the splash clears.
const SPLASH_DURATION_MS = 4100;
const FADE_MS = 300;

export function AppSplash({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Respect reduced-motion: the animation itself goes static in that case
    // (see hole-in-one-loader.module.css), so sitting through the full
    // splash length would just be a pointless pause — skip it almost
    // immediately instead (still via a timer, not a synchronous setState).
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduceMotion ? 0 : SPLASH_DURATION_MS;

    const fadeTimer = setTimeout(() => setFading(true), Math.max(duration - FADE_MS, 0));
    const hideTimer = setTimeout(() => setVisible(false), duration);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <>
      {children}
      {visible && (
        <div className={`${styles.overlay} ${fading ? styles.fadeOut : ""}`}>
          <HoleInOneLoader />
        </div>
      )}
    </>
  );
}
