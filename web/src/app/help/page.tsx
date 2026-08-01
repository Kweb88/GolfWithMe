import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import styles from "./page.module.css";

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do trips and join codes work?",
    a: "Every trip gets a 5-character code. Share it with your group — anyone who enters it under \"Join a Trip\" sees and edits the same live trip, no separate invite links needed.",
  },
  {
    q: "What golf formats are supported?",
    a: "Stroke Play (with optional Skins and Nassau bets), Match Play (1v1), Scramble (teams share one ball per hole), and Ryder Cup Singles (trip-level teams, auto-paired singles matches).",
  },
  {
    q: "What are Skins and Nassau?",
    a: "Skins pays out per hole — lowest score on a hole wins the pot, ties carry the pot to the next hole. Nassau is three separate bets: front 9, back 9, and the full 18.",
  },
  {
    q: "How does Settle Up work — is real money involved?",
    a: "GolfWithMe only tracks who owes who based on your skins/Nassau results, simplified into the fewest payments possible. Tapping Venmo or Cash App opens that app with the amount pre-filled — the actual payment happens there, not in GolfWithMe.",
  },
  {
    q: "What are Trip Awards?",
    a: "Auto-computed once you've logged scores: Trip Champion, Worst Golfer, Most Birdies, Biggest Comeback, and Worst Hole — pulled straight from your rounds, no extra input needed.",
  },
  {
    q: "What's Explore / Find a Fourth?",
    a: "Any trip member can make a trip public and mark it as looking for more players. Public trips show up in Explore for anyone to browse and join with one tap.",
  },
  {
    q: "Who can delete a trip?",
    a: "Only the trip's creator. Deleting a trip removes all of its rounds, scores, and posts for everyone — there's a confirmation step since it can't be undone.",
  },
  {
    q: "What happens if I delete my account?",
    a: "Your login and profile are permanently removed. Trips, rounds, and posts you were part of stay intact for the other members — your name stays on the history, just no longer linked to an account.",
  },
];

export default async function HelpPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  return (
    <>
      <AppHeader />
      <main className={styles.main}>
        <div className={styles.card}>
          <h3>Help &amp; FAQ</h3>
          {FAQS.map((item) => (
            <div key={item.q} className={styles.item}>
              <div className={styles.question}>{item.q}</div>
              <div className={styles.answer}>{item.a}</div>
            </div>
          ))}
        </div>
      </main>
      <BottomNav active="profile" />
    </>
  );
}
