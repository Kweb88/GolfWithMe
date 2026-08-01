"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./course-explore-list.module.css";

export type ExploreCourse = {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
  country: string | null;
  avgRating: number | null;
  reviewCount: number;
};

export function CourseExploreList({ courses }: { courses: ExploreCourse[] }) {
  const [query, setQuery] = useState("");

  const sorted = useMemo(
    () => [...courses].sort((a, b) => b.reviewCount - a.reviewCount || a.name.localeCompare(b.name)),
    [courses],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted.slice(0, 20);
    return sorted
      .filter((c) => `${c.name} ${c.city ?? ""} ${c.region ?? ""} ${c.country ?? ""}`.toLowerCase().includes(q))
      .slice(0, 30);
  }, [sorted, query]);

  return (
    <div>
      <input
        type="text"
        className={styles.search}
        placeholder="Search courses by name or location..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {!query && <div className={styles.hint}>Showing the most-reviewed courses. Search to see all {courses.length}.</div>}
      <div className={styles.list}>
        {visible.map((c) => (
          <Link key={c.id} href={`/explore/courses/${c.id}`} className={styles.item}>
            <div>
              <div className={styles.name}>{c.name}</div>
              <div className={styles.loc}>{[c.city, c.region, c.country].filter(Boolean).join(", ")}</div>
            </div>
            <div className={styles.rating}>
              {c.reviewCount > 0 ? (
                <>
                  ⭐ {c.avgRating!.toFixed(1)}
                  <span className={styles.count}> ({c.reviewCount})</span>
                </>
              ) : (
                <span className={styles.count}>No reviews yet</span>
              )}
            </div>
          </Link>
        ))}
        {visible.length === 0 && <div className={styles.hint}>No courses match &quot;{query}&quot;.</div>}
      </div>
    </div>
  );
}
