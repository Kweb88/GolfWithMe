"use client";

import { useMemo, useState } from "react";
import styles from "./course-picker.module.css";
import formStyles from "@/app/page.module.css";

type Course = { id: string; name: string; city: string | null; region: string | null; country: string | null };

export function CoursePicker({ courses }: { courses: Course[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Course | null>(null);
  const [courseName, setCourseName] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return courses
      .filter((c) => `${c.name} ${c.city ?? ""} ${c.region ?? ""} ${c.country ?? ""}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [courses, query]);

  function pick(c: Course) {
    setSelected(c);
    setCourseName(c.name);
    setQuery("");
  }

  function clear() {
    setSelected(null);
    setCourseName("");
  }

  const location = selected ? [selected.city, selected.region].filter(Boolean).join(", ") : "";

  return (
    <div className={styles.wrap}>
      <div className={formStyles.field}>
        <label htmlFor="courseSearch">Find a course</label>
        <input
          id="courseSearch"
          type="text"
          placeholder="e.g. Scottsdale, Pinehurst, St Andrews..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      </div>
      {matches.length > 0 && (
        <div className={styles.results}>
          {matches.map((c) => (
            <div key={c.id} className={styles.item} onClick={() => pick(c)}>
              <b>{c.name}</b>
              <div className={styles.loc}>
                {c.city}, {c.region}, {c.country}
              </div>
            </div>
          ))}
        </div>
      )}
      {selected && (
        <div className={styles.selected}>
          <span>
            <b>{selected.name}</b> — {location}
          </span>
          <button type="button" className={styles.clear} onClick={clear} aria-label="Clear selected course">
            &times;
          </button>
        </div>
      )}
      <div className={formStyles.field} style={{ marginTop: 10 }}>
        <label htmlFor="courseName">Course name</label>
        <input
          id="courseName"
          name="courseName"
          type="text"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          placeholder="Can't find it? Type it here — saved as a custom course."
          required
        />
      </div>
      <input type="hidden" name="courseId" value={selected?.id ?? ""} />
      <input type="hidden" name="courseLocation" value={location} />
    </div>
  );
}
