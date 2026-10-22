#!/usr/bin/env python3
"""
Parse a WhatsApp chat export into clean JSONL turns.

Supports both common export shapes:

  Android : [9/25/26, 3:22:51 PM] Glory: Good afternoon
  Android : 9/25/26, 3:22:51 PM - Glory: Good afternoon
  iOS     : [9/25/26, 3:22:51 PM] Glory: Good afternoon

Multi-line messages are joined back together, system/notification lines
(e2e notice, "[Call]", "Messages to this chat and calls are now secured...")
are dropped, and every turn records who spoke so the style profiler can tell
the bot's own voice apart from everybody else's.

Usage
-----
  py -3 tools/wa_export/parse_whatsapp.py ^
      --input src/data/chat_export.txt ^
      --me "You" ^
      --out src/data/parsed_chat.jsonl

  # import the whole Downloads folder at once (skips junk like images):
  py -3 tools/wa_export/parse_whatsapp.py ^
      --input "%USERPROFILE%\\Downloads" --me "You" --out src/data/parsed_chat.jsonl
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

# ── Encoding detection ────────────────────────────────────────────────────────
# WhatsApp exports UTF-8 on Android, UTF-16LE-with-BOM on some iOS exports, and
# writeUTF-16 on a few older Windows builds. Guessing wrong turns every emoji
# into mojibake, so sniff the BOM first and fall back to a strict UTF-8 decode.
def read_text(path: Path) -> str:
    raw = path.read_bytes()
    if raw.startswith(b"\xff\xfe"):
        return raw.decode("utf-16-le", errors="replace").lstrip("\ufeff")
    if raw.startswith(b"\xfe\xff"):
        return raw.decode("utf-16-be", errors="replace").lstrip("\ufeff")
    if raw.startswith(b"\xef\xbb\xbf"):
        return raw.decode("utf-8-sig", errors="replace")
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw.decode("cp1252", errors="replace")


# ── Line formats ─────────────────────────────────────────────────────────────
# Bracket form:  [9/25/26, 3:22:51 PM] Sender: text
# Dash form:     9/25/26, 3:22:51 PM - Sender: text
#                   9/25/26, 3:22:51 PM - Sender: text
BRACKET_LINE = re.compile(
    r"^\[(?P<date>[^\]]+)\]\s*(?P<body>.*)$"
)
DASH_LINE = re.compile(
    r"^(?P<date>\d{1,4}[/.\-]\d{1,2}[/.\-]\d{1,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AaPp][Mm])?)\s+-\s+(?P<body>.*)$"
)

# Blank "[date] - ..." (no sender) lines are system notices.
SYSTEM_PREFIXES = (
    "messages and calls are end-to-end encrypted",
    "messages to this chat and calls are now secured",
    "your business uses a secure service",
    "ai from meta receives messages",
    "you received a message on your phone",
    "you changed the group icon",
    "you changed this group's icon",
    "you changed the subject",
    "changed the subject",
    "changed this group's icon",
    "created group",
    "added you",
    "joined using this group's invite link",
    "left",
    "removed",
)

# Media / status placeholders that carry no learnable language.
PLACEHOLDER_RE = re.compile(
    r"^(?:[\u200e\u200f\s]*)"
    r"(?:\[?<?(?:media omitted|image omitted|video omitted|audio omitted|"
    r"document omitted|sticker omitted|GIF omitted|Contact card omitted)>?\]?)"
    r"(?:[\u200e\u200f\s]*)$",
    re.IGNORECASE,
)
CALL_RE = re.compile(r"^\[?\s*(?:call|video call|missed call|Missed voice call)\s*\]?$", re.IGNORECASE)
DURATION_ONLY_RE = re.compile(r"^\d+\s*(?:sec|secs|second|seconds|min|mins|minute|minutes|hr|hrs|hour|hours)$", re.IGNORECASE)


def is_system_body(body: str) -> bool:
    low = body.strip().lower()
    if not low:
        return True
    if low.startswith("-"):
        return True
    if CALL_RE.match(low):
        return True
    return any(low.startswith(p) for p in SYSTEM_PREFIXES)


def split_sender(body: str):
    """
    Split 'Sender: message' — sender names may themselves contain colons on
    business accounts ('Meta: Hello'), so prefer the SHORTEST plausible prefix
    that is not absurdly long, and fall back to 'no sender' for system lines.
    """
    if ":" not in body:
        return None, body
    head, rest = body.split(":", 1)
    head = head.strip()
    if not head or len(head) > 60 or "\n" in head:
        return None, body
    # A real sender name never starts with a bullet or a long sentence.
    if len(head.split()) > 8:
        return None, body
    return head, rest.lstrip(" \u200e\u200f")


def parse_timestamp(raw: str):
    cleaned = raw.strip().replace("\u200e", "").replace("\u200f", "")
    patterns = [
        "%m/%d/%y, %I:%M:%S %p",
        "%m/%d/%y, %I:%M %p",
        "%m/%d/%Y, %I:%M:%S %p",
        "%m/%d/%Y, %I:%M %p",
        "%d/%m/%y, %I:%M:%S %p",
        "%d/%m/%y, %I:%M %p",
        "%d/%m/%Y, %I:%M:%S %p",
        "%d/%m/%Y, %I:%M %p",
        "%Y-%m-%d, %H:%M:%S",
        "%Y-%m-%d, %H:%M",
        "%d.%m.%y, %H:%M:%S",
        "%d.%m.%y, %H:%M",
        "%d/%m/%y %H:%M:%S",
        "%d/%m/%y %H:%M",
    ]
    for fmt in patterns:
        try:
            return datetime.strptime(cleaned, fmt).isoformat()
        except ValueError:
            continue
    return None


def parse_file(path: Path, me: str | None) -> list[dict]:
    text = read_text(path)
    chat_name = path.stem
    turns: list[dict] = []
    current = None  # {sender, timestamp, parts}

    def flush():
        nonlocal current
        if not current:
            return
        body = "\n".join(current["parts"]).strip()
        current = None
        if not body or is_system_body(body):
            return
        if PLACEHOLDER_RE.match(body) or CALL_RE.match(body) or DURATION_ONLY_RE.match(body):
            return
        sender = current_sender
        turns.append(
            {
                "chat": chat_name,
                "sender": sender or "",
                "timestamp": current_ts,
                "text": body,
                "is_me": bool(me) and (sender or "").strip().lower() == me.strip().lower(),
                "source": str(path.name),
            }
        )

    current_sender = None
    current_ts = None

    for line in text.splitlines():
        body = None
        ts_raw = None

        m = BRACKET_LINE.match(line)
        if m:
            ts_raw, body = m.group("date"), m.group("body")
        else:
            m = DASH_LINE.match(line)
            if m:
                ts_raw, body = m.group("date"), m.group("body")

        if body is None:
            # Continuation of the previous message (multi-line text, list, quote).
            if current is not None:
                current["parts"].append(line)
            continue

        # A new timestamped line — close the previous message first.
        flush()

        if is_system_body(body):
            current = None
            continue

        sender, message = split_sender(body)
        if sender is None:
            # Timestamped but no sender → system/notification line.
            current = None
            continue

        current_sender = sender
        current_ts = parse_timestamp(ts_raw)
        current = {"parts": [message]}

    flush()
    return turns


def collect_inputs(target: Path) -> list[Path]:
    if target.is_file():
        return [target]
    if not target.is_dir():
        raise SystemExit(f"Input not found: {target}")
    files = []
    for p in sorted(target.rglob("*")):
        if p.is_file() and p.suffix.lower() in {".txt", ".csv"}:
            files.append(p)
    return files


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Parse WhatsApp exports into JSONL turns.")
    ap.add_argument("--input", required=True, help="Chat .txt file, or a folder to scan recursively.")
    ap.add_argument("--me", default=None, help='The label your own messages carry, e.g. "You".')
    ap.add_argument("--out", default="src/data/parsed_chat.jsonl", help="Output JSONL path.")
    ap.add_argument("--min-chars", type=int, default=1, help="Drop turns shorter than this.")
    args = ap.parse_args(argv)

    target = Path(os.path.expandvars(os.path.expanduser(args.input)))
    out_path = Path(os.path.expandvars(os.path.expanduser(args.out)))

    files = collect_inputs(target)
    if not files:
        print(f"No .txt exports found under {target}", file=sys.stderr)
        return 1

    all_turns: list[dict] = []
    for f in files:
        turns = parse_file(f, args.me)
        turns = [t for t in turns if len(t["text"].strip()) >= args.min_chars]
        all_turns.extend(turns)
        print(f"  {f.name}: {len(turns)} turns")

    all_turns.sort(key=lambda t: t["timestamp"] or "")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8", newline="\n") as fh:
        for t in all_turns:
            fh.write(json.dumps(t, ensure_ascii=False) + "\n")

    mine = sum(1 for t in all_turns if t["is_me"])
    print(f"\nWrote {len(all_turns)} turns ({mine} from you) -> {out_path}")
    if all_turns and mine == 0:
        print('WARNING: no turns matched --me. Check the label your own messages use.', file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
