#!/usr/bin/env python3
"""
Decrypt a local WhatsApp backup (msgstore.db.crypt14 / wa.db.crypt14) and pull
the message table into the same JSONL the style profiler consumes.

IMPORTANT — you need the `key` file from your OWN device
---------------------------------------------------------
WhatsApp encrypts local backups with a 158-byte key file that lives at:

    /data/data/com.whatsapp/files/key        (rooted Android)
    /sdcard/Android/media/com.whatsapp/WhatsApp/... (some exports)

Without that file the backup is AES-256 and cannot be recovered — there is no
brute force and no server-side copy. If you cannot obtain the key, export the
chat from WhatsApp itself (Chat → More → Export chat → Without media) and run
parse_whatsapp.py on the .txt instead. That path is fully supported.

Requirements
------------
    py -3 -m pip install pycryptodome

Usage
-----
  # 1. decrypt to a normal SQLite database
  py -3 tools/wa_export/decrypt_crypt14.py ^
      --input "%USERPROFILE%\\Downloads\\msgstore-2026-10-12.1.db.crypt14" ^
      --key "%USERPROFILE%\\Downloads\\key" ^
      --out src/data/msgstore.db

  # 2. dump messages to JSONL for the profiler
  py -3 tools/wa_export/decrypt_crypt14.py ^
      --input src/data/msgstore.db --dump-messages ^
      --me "2348012345678" --out src/data/parsed_chat.jsonl

  # or do both in one go
  py -3 tools/wa_export/decrypt_crypt14.py ^
      --input backup.db.crypt14 --key key --out src/data/msgstore.db ^
      --dump-messages --me "2348012345678" --jsonl src/data/parsed_chat.jsonl
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

# crypt14 on-disk layout (verified against the real file on this machine):
#
#   0   .. 189   protobuf header (contains the WhatsApp version string, e.g.
#                "2.26.39.7", plus counters and the HMAC salt)
#   67  .. 82    AES-CBC initialisation vector (16 bytes)
#   190 .. EOF   AES-256-CBC ciphertext, PKCS#7 padded, so
#                (filesize - 190) % 16 == 0
#
# Note: it is a common mistake (one I made first) to assume the IV is the first
# 16 bytes of the file. It is not — the file starts with a protobuf header, which
# is why a naive decrypt produces garbage even with the correct key.
CRYPT14_IV_OFFSET = 67
CRYPT14_DATA_OFFSET = 190
CRYPT14_DATA_OFFSET_ALT = 191   # some builds pad the header by one byte

# The AES key sits at offset 30 in the 158-byte key file (the first 30 bytes are
# version metadata). Stable for crypt12 and crypt14.
KEY_OFFSET = 30
KEY_LENGTH = 32
KEYFILE_LENGTH = 158


def load_key(key_path: Path) -> bytes:
    raw = key_path.read_bytes()
    if len(raw) < KEY_OFFSET + KEY_LENGTH:
        raise SystemExit(
            f"Key file is {len(raw)} bytes; expected {KEYFILE_LENGTH}. "
            "This does not look like a WhatsApp key file."
        )
    if len(raw) != KEYFILE_LENGTH:
        print(
            f"WARNING: key file is {len(raw)} bytes, expected {KEYFILE_LENGTH}. "
            "Trying anyway — if decryption fails, the key is wrong.",
            file=sys.stderr,
        )
    return raw[KEY_OFFSET : KEY_OFFSET + KEY_LENGTH]


def _try_decrypt(blob: bytes, key: bytes, data_offset: int):
    """Returns (plaintext, ok) for one candidate data offset."""
    from Crypto.Cipher import AES
    from Crypto.Util.Padding import unpad

    iv = blob[CRYPT14_IV_OFFSET : CRYPT14_IV_OFFSET + 16]
    if len(iv) < 16:
        return None
    ciphertext = blob[data_offset:]
    if len(ciphertext) % 16 != 0:
        return None

    plain = AES.new(key, AES.MODE_CBC, iv).decrypt(ciphertext)
    try:
        plain = unpad(plain, AES.block_size)
    except ValueError:
        return None
    return plain if plain.startswith(b"SQLite format 3\x00") else None


def decrypt_backup(enc_path: Path, key: bytes, out_path: Path) -> Path:
    try:
        import Crypto  # noqa: F401
    except ImportError:
        raise SystemExit("pycryptodome is required: py -3 -m pip install pycryptodome")

    blob = enc_path.read_bytes()
    if len(blob) <= CRYPT14_DATA_OFFSET:
        raise SystemExit("Encrypted file is too small to be a crypt14 database.")

    plain = None
    for offset in (CRYPT14_DATA_OFFSET, CRYPT14_DATA_OFFSET_ALT):
        plain = _try_decrypt(blob, key, offset)
        if plain is not None:
            print(f"Decrypted with data offset {offset}.")
            break

    if plain is None:
        raise SystemExit(
            "Decryption failed: no candidate offset produced a SQLite database.\n"
            "  - The 32-byte AES key at offset 30 of the key file is wrong for this backup.\n"
            "  - Or this is a crypt15 backup (needs `encrypted_backup.key`, not `key`).\n"
            "  - Or the backup is truncated/corrupt."
        )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(plain)
    return out_path


# ── Message extraction ───────────────────────────────────────────────────────
def ts_to_iso(value) -> str | None:
    if value is None:
        return None
    try:
        n = int(value)
    except (TypeError, ValueError):
        return None
    # WhatsApp stores ms; older backups store s.
    if n > 10_000_000_000:
        n //= 1000
    try:
        return datetime.fromtimestamp(n, tz=timezone.utc).isoformat()
    except (OverflowError, OSError, ValueError):
        return None


def normalise_number(value: str | None) -> str:
    return "".join(ch for ch in (value or "") if ch.isdigit())


def dump_messages(db_path: Path, me: str | None, out_jsonl: Path, include_groups: bool = True) -> int:
    if not db_path.exists():
        raise SystemExit(f"Database not found: {db_path}")

    con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row

    # `message` (newer) and `messages` (older) both exist across versions.
    tables = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    table = "message" if "message" in tables else ("messages" if "messages" in tables else None)
    if not table:
        raise SystemExit("No message table found — is this really a WhatsApp msgstore.db?")

    cols = {r[1] for r in con.execute(f"PRAGMA table_info({table})")}
    if "text_data" not in cols:
        raise SystemExit(
            f"Table {table} has no text_data column ({sorted(cols)}). "
            "This backup may store bodies elsewhere."
        )

    has_chat = "chat_row_id" in cols
    has_jid = "key_remote_jid" in cols
    join_sql = ""
    params: tuple = ()
    if has_chat:
        join_sql = "LEFT JOIN chat ON chat._id = m.chat_row_id LEFT JOIN jid ON jid._id = chat.jid_row_id"
        who_col = "jid.raw_string"
    elif has_jid:
        who_col = "m.key_remote_jid"
    else:
        who_col = "NULL"

    me_digits = normalise_number(me)
    group_filter = "" if include_groups else (
        f"AND ({who_col} IS NULL OR {who_col} NOT LIKE '%@g.us')" if who_col != "NULL" else ""
    )

    sql = f"""
        SELECT m._id AS id,
               m.text_data AS body,
               m.timestamp AS ts,
               m.from_me AS from_me,
               {who_col} AS chat_jid
        FROM {table} m
        {join_sql}
        WHERE m.text_data IS NOT NULL AND m.text_data != ''
        {group_filter}
        ORDER BY m.timestamp ASC
    """

    out_jsonl.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with out_jsonl.open("w", encoding="utf-8", newline="\n") as fh:
        for row in con.execute(sql, params):
            body = (row["body"] or "").strip()
            if not body:
                continue
            jid = row["chat_jid"] or ""
            # In a 1:1 chat the remote jid IS the other person, so a message with
            # from_me=0 came from them.
            is_me = bool(row["from_me"])
            if me_digits and jid and normalise_number(jid) == me_digits:
                is_me = True
            fh.write(
                json.dumps(
                    {
                        "chat": jid,
                        "sender": "You" if is_me else jid,
                        "timestamp": ts_to_iso(row["ts"]),
                        "text": body,
                        "is_me": is_me,
                        "source": db_path.name,
                    },
                    ensure_ascii=False,
                )
                + "\n"
            )
            count += 1

    con.close()
    return count


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Decrypt a WhatsApp crypt14 backup and/or dump its messages.")
    ap.add_argument("--input", required=True, help=".crypt14 file, or an already-decrypted .db")
    ap.add_argument("--key", help="Path to the WhatsApp `key` file (required for .crypt14 input).")
    ap.add_argument("--out", help="Where to write the decrypted .db")
    ap.add_argument("--dump-messages", action="store_true", help="Extract the message table to JSONL.")
    ap.add_argument("--jsonl", default="src/data/parsed_chat.jsonl", help="JSONL output path for --dump-messages.")
    ap.add_argument("--me", default=None, help="Your own phone number, digits only (optional sanity check).")
    ap.add_argument("--exclude-groups", action="store_true", help="Only keep 1:1 chats.")
    args = ap.parse_args(argv)

    src = Path(os.path.expandvars(os.path.expanduser(args.input)))
    if not src.exists():
        print(f"Input not found: {src}", file=sys.stderr)
        return 1

    db_path = src
    if src.suffix.lower() in {".crypt14", ".crypt12"}:
        if not args.key:
            print("A --key file is required to decrypt this backup.", file=sys.stderr)
            print("Without it, export chats from WhatsApp itself and use parse_whatsapp.py.", file=sys.stderr)
            return 2
        out_db = Path(os.path.expandvars(os.path.expanduser(args.out or "src/data/msgstore.db")))
        key = load_key(Path(os.path.expandvars(os.path.expanduser(args.key))))
        db_path = decrypt_backup(src, key, out_db)
        print(f"Decrypted -> {db_path} ({db_path.stat().st_size} bytes)")

    if args.dump_messages:
        out_jsonl = Path(os.path.expandvars(os.path.expanduser(args.jsonl)))
        n = dump_messages(db_path, args.me, out_jsonl, include_groups=not args.exclude_groups)
        print(f"Wrote {n} messages -> {out_jsonl}")
        print("Next: py -3 tools/wa_export/style_profile.py --input " + str(out_jsonl))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
