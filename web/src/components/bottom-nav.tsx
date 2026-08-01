import Link from "next/link";
import styles from "./bottom-nav.module.css";

type Tab = "trips" | "feed" | "explore" | "profile";

const TABS: { key: Tab; label: string; href: string; icon: React.ReactNode }[] = [
  {
    key: "trips",
    label: "Trips",
    href: "/",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l9-7 9 7" />
        <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
      </svg>
    ),
  },
  {
    key: "feed",
    label: "Feed",
    href: "/feed",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.8 8.6c0 4.5-8.8 10-8.8 10s-8.8-5.5-8.8-10a4.8 4.8 0 0 1 8.8-2.7A4.8 4.8 0 0 1 20.8 8.6z" />
      </svg>
    ),
  },
  {
    key: "explore",
    label: "Explore",
    href: "/explore",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M15.5 8.5l-2 5-5 2 2-5z" />
      </svg>
    ),
  },
  {
    key: "profile",
    label: "Profile",
    href: "",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
      </svg>
    ),
  },
];

export function BottomNav({ active }: { active: Tab }) {
  return (
    <>
      <div className={styles.spacer} />
      <nav className={styles.nav}>
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          const isDisabled = !tab.href;
          if (isDisabled) {
            return (
              <button key={tab.key} type="button" className={`${styles.item} ${styles.disabled}`} disabled>
                {tab.icon}
                <span className={styles.label}>{tab.label}</span>
              </button>
            );
          }
          return (
            <Link key={tab.key} href={tab.href} className={`${styles.item} ${isActive ? styles.active : ""}`}>
              {tab.icon}
              <span className={styles.label}>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
