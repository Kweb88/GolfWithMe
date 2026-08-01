import Link from "next/link";
import { SignOutButton } from "@/app/sign-out-button";
import styles from "./app-header.module.css";

export function AppHeader({ tripCode }: { tripCode?: string }) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        <span aria-hidden className={styles.logo}>
          ⛳
        </span>
        <div className={styles.wordmark}>
          Golf<span className={styles.with}>With</span>Me
        </div>
      </Link>
      {tripCode ? (
        <span className={styles.codePill}>{tripCode}</span>
      ) : (
        <SignOutButton className={styles.signOut} />
      )}
    </header>
  );
}
