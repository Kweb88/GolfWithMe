export type Debt = { from: string; to: string; amount: number };

// Ported from the prototype's simplifyDebts: a greedy match of biggest
// creditor against biggest debtor, minimizing the number of payments needed
// to settle a set of net balances that should sum to (near) zero.
export function simplifyDebts(balances: Record<string, number>): Debt[] {
  const creditors = Object.entries(balances)
    .filter(([, v]) => v > 0.01)
    .map(([id, amt]) => ({ id, amt }))
    .sort((a, b) => b.amt - a.amt);
  const debtors = Object.entries(balances)
    .filter(([, v]) => v < -0.01)
    .map(([id, amt]) => ({ id, amt: -amt }))
    .sort((a, b) => b.amt - a.amt);

  const txns: Debt[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    txns.push({ from: debtors[i].id, to: creditors[j].id, amount: pay });
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt < 0.01) i++;
    if (creditors[j].amt < 0.01) j++;
  }
  return txns;
}

export function venmoLink(username: string, amount: number, note: string) {
  const handle = username.replace(/^@/, "");
  return `https://venmo.com/${encodeURIComponent(handle)}?txn=pay&amount=${amount.toFixed(2)}&note=${encodeURIComponent(note)}`;
}

export function cashAppLink(cashtag: string, amount: number) {
  const handle = cashtag.replace(/^\$/, "");
  return `https://cash.app/$${encodeURIComponent(handle)}/${amount.toFixed(2)}`;
}
