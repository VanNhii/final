"""Dangerous: delete documents from collections.

Usage:
  python scripts/cleanup_db.py --collections rag_chunks users candidates recruiters jobs jobcategories --yes
  python scripts/cleanup_db.py --all --yes

Notes:
- This only deletes documents. Atlas Search / Vector Search indexes remain *if the collection remains*.
- If you DROP the collection, indexes are removed and must be recreated.
"""

from __future__ import annotations

import argparse
import os

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise RuntimeError("Missing MONGODB_URI in .env")

DB_NAME = os.getenv("MONGODB_DB_NAME", "datn_1")

DEFAULT_COLS = [
    os.getenv("RAG_COLLECTION", "rag_chunks"),
    os.getenv("USERS_COLLECTION", "users"),
    os.getenv("CANDIDATE_COLLECTION", "candidates"),
    os.getenv("RECRUITER_COLLECTION", "recruiters"),
    os.getenv("JOB_COLLECTION", "jobs"),
    os.getenv("JOBCATEGORY_COLLECTION", "jobcategories"),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--collections", nargs="*", default=None, help="Collection names to wipe")
    ap.add_argument("--all", action="store_true", help="Wipe default collections")
    ap.add_argument("--yes", action="store_true", help="Required confirmation")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not args.yes:
        raise SystemExit("Refusing to delete data. Re-run with --yes")

    cols = args.collections
    if args.all or not cols:
        cols = DEFAULT_COLS

    client = MongoClient(MONGODB_URI)
    db = client[DB_NAME]

    for name in cols:
        if not name:
            continue
        col = db[name]
        if args.dry_run:
            cnt = col.count_documents({})
            print(f"[DRY] {name}: would delete {cnt} docs")
        else:
            res = col.delete_many({})
            print(f"{name}: deleted {res.deleted_count} docs")


if __name__ == "__main__":
    main()
