"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

function LoginError() {
  const searchParams = useSearchParams();
  if (searchParams.get("error") !== "auth_failed") return null;
  return (
    <p className={styles.error}>
      That sign-in attempt didn&apos;t go through. Try again.
    </p>
  );
}

export default function LoginPage() {
  const [pending, setPending] = useState<"google" | "apple" | null>(null);

  async function signInWith(provider: "google" | "apple") {
    setPending(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setPending(null);
  }

  return (
    <div className={styles.wrap}>
      <div className={`${styles.wordmark} display`}>
        Golf<span className={styles.with}>With</span>Me
      </div>
      <p className={styles.tagline}>
        Plan the trip, settle the bets, remember the round.
      </p>
      <div className={styles.buttons}>
        <button
          type="button"
          className={styles.button}
          disabled={pending !== null}
          onClick={() => signInWith("google")}
        >
          {pending === "google" ? "Redirecting…" : "Continue with Google"}
        </button>
        <button
          type="button"
          className={styles.button}
          disabled={pending !== null}
          onClick={() => signInWith("apple")}
        >
          {pending === "apple" ? "Redirecting…" : "Continue with Apple"}
        </button>
      </div>
      <Suspense fallback={null}>
        <LoginError />
      </Suspense>
    </div>
  );
}
