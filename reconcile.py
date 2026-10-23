#!/usr/bin/env python3
"""Payment reconciliation.

Reads payments.jsonl and works out how much money we actually collected.
Run:  python3 reconcile.py
"""
import json

# Keep only the latest attempt per txn_id, since retries share the same id.
latest_by_txn = {}

with open("payments.jsonl") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue  # Skip lines that aren't valid JSON.

        txn_id = event.get("txn_id")
        if not txn_id:
            continue  # Skip events without a txn_id.

        existing = latest_by_txn.get(txn_id)
        if existing is None or event["ts"] > existing["ts"]:
            latest_by_txn[txn_id] = event  # Newer timestamp replaces the stored attempt.

total = 0.0
count = 0
for event in latest_by_txn.values():
    if event["status"] == "success":  # Only the latest attempt's status counts.
        amount = str(event["amount"]).replace(",", "")  # Some amounts have comma separators.
        total += float(amount)
        count += 1

with open("expected.txt") as f:
    expected = int(f.read().strip())

if count != expected:
    print(f"Check failed: counted {count} successful payments, expected {expected}.")
    print("Something in the data isn't being handled the way the README describes.")
else:
    print(f"Check passed: {count} successful payments.")
    print(f"Your code: KOYA-{round(total)}")
