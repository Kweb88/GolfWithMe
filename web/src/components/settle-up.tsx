import { cashAppLink, venmoLink } from "@/lib/money";
import styles from "./settle-up.module.css";

type SettleUpDebt = {
  fromName: string;
  toName: string;
  amount: number;
  toVenmo: string | null;
  toCashapp: string | null;
};

export function SettleUp({ debts, tripName }: { debts: SettleUpDebt[]; tripName: string }) {
  return (
    <div className={styles.list}>
      {debts.map((d, i) => (
        <div key={i} className={styles.row}>
          <div className={styles.text}>
            <span className={styles.from}>{d.fromName}</span> owes{" "}
            <span className={styles.to}>{d.toName}</span>
            <span className={styles.amount}> ${d.amount.toFixed(2)}</span>
          </div>
          {(d.toVenmo || d.toCashapp) && (
            <div className={styles.buttons}>
              {d.toVenmo && (
                <a
                  className={styles.payBtn}
                  href={venmoLink(d.toVenmo, d.amount, `${tripName} bets`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Venmo
                </a>
              )}
              {d.toCashapp && (
                <a
                  className={styles.payBtn}
                  href={cashAppLink(d.toCashapp, d.amount)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Cash App
                </a>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
