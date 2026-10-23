// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money we actually collected.
// Run:  node reconcile.js

const fs = require("fs");

// Keep only the latest attempt per txn_id, since retries share the same id.
const latestByTxn = new Map();

const lines = fs.readFileSync("payments.jsonl", "utf8").split("\n").filter((l) => l.length > 0);
for (const line of lines) {
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue; // Skip lines that aren't valid JSON.
  }

  const txnId = event.txn_id;
  if (!txnId) continue; // Skip events without a txn_id.

  const existing = latestByTxn.get(txnId);
  if (!existing || event.ts > existing.ts) {
    latestByTxn.set(txnId, event); // Newer timestamp replaces the stored attempt.
  }
}

let total = 0;
let count = 0;
for (const event of latestByTxn.values()) {
  if (event.status === "success") { // Only the latest attempt's status counts.
    total += Number(String(event.amount).replace(/,/g, "")); // Some amounts have comma separators.
    count += 1;
  }
}

const expected = parseInt(fs.readFileSync("expected.txt", "utf8").trim(), 10);

if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way the README describes.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${Math.round(total)}`);
}
