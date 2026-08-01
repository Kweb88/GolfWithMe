import Link from "next/link";
import { SignOutButton } from "@/app/sign-out-button";
import styles from "./app-header.module.css";

export function AppHeader({ tripCode }: { tripCode?: string }) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        <span aria-hidden style={{ fontSize: 20 }}>
          ⛳
        </span>
        <div className={`${styles.wordmark} display`}>
          Golf<span className={styles.with}>With</span>Me
        </div>
      </Link>
      {tripCode ? (
        <span className={styles.codePill}>CODE: {tripCode}</span>
      ) : (
        <SignOutButton />
      )}
    </header>
  );
}
