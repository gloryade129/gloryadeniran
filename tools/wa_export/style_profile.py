#!/usr/bin/env python3
"""
Distil a real WhatsApp history into a *voice profile* + few-shot exemplars.

This is the "training" stage of the pipeline. We are deliberately NOT fine-tuning
a provider model (Gemini/Groq have no open fine-tune endpoint, and a fine-tune
would still hallucinate). Instead we measure how the human actually types and
turn those measurements into (a) hard rules injected into the system prompt and
(b) real exchange pairs used as in-context exemplars. That is what stops the bot
from falling back to the generic "As an AI assistant, I'd be happy to help..."
register: every reply is anchored to observed behaviour instead of a prior.

Input : JSONL from parse_whatsapp.py
Output: src/data/style_profile.json  +  src/data/fewshot.json

Usage
-----
  py -3 tools/wa_export/style_profile.py --input src/data/parsed_chat.jsonl
"""

from __future__ import annotations

import argparse
import json
import os
import re
import statistics
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

# ── Emoji handling (no third-party deps) ─────────────────────────────────────
EMOJI_RE = re.compile(
    "[" 
    "\U0001F300-\U0001FAFF"
    "\U0001F000-\U0001F2FF"
    "\u2600-\u27BF"
    "\u2B00-\u2BFF"
    "\uFE0F\u200D"
    "]+",
    flags=re.UNICODE,
)
EMOJI_ONLY_RE = re.compile(r"^[\s\U0001F300-\U0001FAFF\u2600-\u27BF\uFE0F\u200D]+$")

# Corruption from a lossy export (e.g. "Okay ma \ufffd~1\ufffd,?") — never train on it.
MOJIBAKE_RE = re.compile("[\ufffd\u0000]|Ã.|Â.|â..")

CONTRACTIONS = {
    "i'm", "im", "i've", "ive", "i'll", "ill", "i'd", "you're", "youre", "you've",
    "you'll", "it's", "its", "that's", "thats", "what's", "whats", "don't", "dont",
    "doesn't", "doesnt", "didn't", "didnt", "can't", "cant", "won't", "wont",
    "isn't", "isnt", "aren't", "arent", "wasn't", "wasnt", "let's", "lets",
    "we're", "were", "they're", "there's", "theres", "how's", "hows", "who's",
}

# Nigerian-English / local register markers. Presence of these is a strong signal
# that the persona is West-African, not a sanitised US-English assistant.
NAIJA_MARKERS = [
    "abeg", "sha", "na", "wetin", "dey", "una", "oga", "madam", "ma", "sir",
    "biko", "wahala", "shey", "sef", "gan", "jare", "ehen", "okay o", "o ",
    "no wahala", "well done", "sorry for the delay", "pls", "pls.", "kindly",
]

STOPWORDS = set("""
a an the and or but if then than that this these those is are was were be been being
i you he she it we they me him her us them my your his their our to of in on at for
with from by as so not no yes do does did doing have has had having will would can
could should may might must just very really about into over after before again
there here what which who whom when where why how all any both each few more most
other some such only own same too also up down out off than now get got go going
""".split())

WORD_RE = re.compile(r"[A-Za-z']+")


def strip_noise(text: str) -> str:
    """Remove export corruption and zero-width direction marks."""
    text = text.replace("\u200e", "").replace("\u200f", "").replace("\u2066", "").replace("\u2069", "")
    return text.strip()


def is_trainable(text: str) -> bool:
    if not text or len(text.strip()) < 2:
        return False
    if MOJIBAKE_RE.search(text):
        return False          # unrecoverable encoding damage
    if EMOJI_ONLY_RE.match(text):
        return False          # a bare emoji is not a style sample
    if text.strip() in {"<Media omitted>", "null"}:
        return False
    return True


def rate(part: int, whole: int) -> float:
    return round(part / whole, 3) if whole else 0.0


def quantile(values: list[int], q: float) -> int:
    if not values:
        return 0
    ordered = sorted(values)
    idx = min(len(ordered) - 1, max(0, int(round(q * (len(ordered) - 1)))))
    return ordered[idx]


GREETING_RE = re.compile(
    r"^(hi|hello|hey|good\s+(morning|afternoon|evening|day)|morning|afternoon|evening|"
    r"how\s+far|how\s+are\s+you|how\s+you\s+dey|wassup|what'?s\s+up)\b",
    re.IGNORECASE,
)
MEDIA_PLACEHOLDERS = {
    "<media omitted>", "<media omitted, unable to download>", "sticker omitted",
    "image omitted", "video omitted", "audio omitted", "document omitted",
    "gif omitted", "contact card omitted", "null",
}


def _is_media_placeholder(text: str) -> bool:
    return text.strip().lower() in MEDIA_PLACEHOLDERS


def _is_question(text: str) -> bool:
    t = text.strip()
    if "?" in t:
        return True
    return bool(re.match(r"^(how|what|when|where|who|which|why|can|could|will|would|should|is|are|do|does|did|have|has)\b", t, re.IGNORECASE))


def build_engagement(turns: list[dict]) -> dict:
    """
    Learns WHEN the owner speaks, not just how he types.

    Two numbers matter to src/selective-reply.js:

      participation.overall  how much of the conversation he actually carries.
                             A person who writes one message in twenty should not
                             have a bot answering one in three.

      response.question_rate  of the questions that arrived, how many did he
                             actually answer? That is the strongest evidence of
                             where his attention goes.

    Both are measured, not guessed. Without them the "when to reply" gate has to
    fall back to fixed probabilities, which is exactly the robotic behaviour we
    are trying to remove.
    """
    by_chat: dict[str, list[dict]] = {}
    for t in turns:
        by_chat.setdefault(t.get("chat") or "unknown", []).append(t)

    total = len(turns)
    mine_total = sum(1 for t in turns if t.get("is_me"))

    per_chat = []
    question_asked = question_answered = 0
    greeting_asked = greeting_answered = 0
    media_placeholders = 0

    for chat, rows in by_chat.items():
        mine = sum(1 for r in rows if r.get("is_me"))
        per_chat.append({
            "chat": chat,
            "total": len(rows),
            "mine": mine,
            "participation": rate(mine, len(rows)),
        })

        for prev, cur in zip(rows, rows[1:]):
            if prev.get("is_me"):
                continue
            text = strip_noise(prev.get("text") or "")
            if not text:
                continue
            if _is_question(text):
                question_asked += 1
                if cur.get("is_me"):
                    question_answered += 1
            if GREETING_RE.match(text):
                greeting_asked += 1
                if cur.get("is_me"):
                    greeting_answered += 1

    for t in turns:
        if _is_media_placeholder(strip_noise(t.get("text") or "")):
            media_placeholders += 1

    # Length of the runs where he speaks — a person who sends three short lines
    # in a row is a different conversational animal from a one-and-done replier.
    runs: list[int] = []
    current = 0
    for t in turns:
        if t.get("is_me"):
            current += 1
        elif current:
            runs.append(current)
            current = 0
    if current:
        runs.append(current)

    per_chat.sort(key=lambda c: c["total"], reverse=True)

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": {"turns": total, "my_turns": mine_total, "chats": len(by_chat)},
        "participation": {
            "overall": rate(mine_total, total),
            "messages_per_own_message": round(total / mine_total, 2) if mine_total else 0,
            "per_chat": per_chat[:20],
        },
        "response": {
            "questions_asked": question_asked,
            "questions_answered": question_answered,
            "question_rate": rate(question_answered, question_asked),
            "greetings_asked": greeting_asked,
            "greetings_answered": greeting_answered,
            "greeting_rate": rate(greeting_answered, greeting_asked),
        },
        "bursts": {
            "runs": len(runs),
            "mean": round(statistics.mean(runs), 2) if runs else 0,
            "p90": quantile(runs, 0.9),
            "max": max(runs) if runs else 0,
        },
        "media": {
            "placeholder_rate": rate(media_placeholders, total),
            "sticker_rate": rate(
                sum(1 for t in turns if "sticker omitted" in (t.get("text") or "").lower()),
                total,
            ),
        },
    }


def build_fewshot(turns: list[dict], limit: int = 12) -> list[dict]:
    """
    Pair each of *my* replies with the message directly before it, so the model
    sees 'this came in → that is what I said back' in the real register.
    """
    pairs: list[dict] = []
    for prev, cur in zip(turns, turns[1:]):
        if not cur["is_me"] or prev["is_me"]:
            continue
        if prev["chat"] != cur["chat"]:
            continue
        user, reply = strip_noise(prev["text"]), strip_noise(cur["text"])
        if not is_trainable(user) or not is_trainable(reply):
            continue
        if len(user) > 300 or len(reply) > 300:
            continue
        pairs.append({"user": user, "model": reply})

    # Keep the most compact, most human-sounding examples first: short replies
    # teach brevity better than paragraphs do.
    pairs.sort(key=lambda p: (len(p["model"]), len(p["user"])))
    seen, unique = set(), []
    for p in pairs:
        key = p["model"].lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(p)
    return unique[:limit]


def profile(turns: list[dict], fewshot_limit: int = 12) -> tuple[dict, dict]:
    mine = [t for t in turns if t.get("is_me")]
    mine = [dict(t, text=strip_noise(t["text"])) for t in mine]
    mine = [t for t in mine if is_trainable(t["text"])]

    if not mine:
        raise SystemExit(
            "No messages matched --me. Re-run parse_whatsapp.py with the label your own "
            'messages carry (usually "You").'
        )

    texts = [t["text"] for t in mine]
    lengths = [len(x) for x in texts]
    line_counts = [x.count("\n") + 1 for x in texts]

    # ── Emoji ────────────────────────────────────────────────────────────────
    emoji_counter: Counter[str] = Counter()
    msgs_with_emoji = 0
    for x in texts:
        found = EMOJI_RE.findall(x)
        if found:
            msgs_with_emoji += 1
            for group in found:
                for ch in group:
                    if ch not in ("\ufe0f", "\u200d"):
                        emoji_counter[ch] += 1

    # ── Punctuation / casing ─────────────────────────────────────────────────
    def endswith(ch: str) -> int:
        return sum(1 for x in texts if x.rstrip().endswith(ch))

    ends_period = endswith(".")
    ends_question = endswith("?")
    ends_bang = endswith("!")
    PUNCT = set(".,!?;:'\"-)\u2026")
    ends_none = sum(1 for x in texts if x.rstrip() and x.rstrip()[-1] not in PUNCT)
    ellipsis = sum(1 for x in texts if "..." in x or "\u2026" in x)
    lowercase_start = sum(1 for x in texts if x[:1].islower())
    allcaps = sum(1 for x in texts if re.search(r"\b[A-Z]{3,}\b", x))

    # ── Vocabulary ───────────────────────────────────────────────────────────
    words = Counter()
    contractions_used = Counter()
    for x in texts:
        low = x.lower()
        for w in WORD_RE.findall(low):
            if w in CONTRACTIONS:
                contractions_used[w] += 1
            if w in STOPWORDS or len(w) < 3:
                continue
            words[w] += 1

    naija = [m for m in NAIJA_MARKERS if re.search(r"\b" + re.escape(m.strip()) + r"\b", " ".join(texts).lower())]

    openers = Counter()
    closers = Counter()
    for x in texts:
        first = re.split(r"[\s,!.?]+", x.strip())[:2]
        if first and first[0]:
            openers[" ".join(first).lower()] += 1
        tail = x.strip().split()[-2:]
        if tail:
            closers[" ".join(tail).lower()] += 1

    # ── Derived voice brief ──────────────────────────────────────────────────
    mean_len = round(statistics.mean(lengths)) if lengths else 0
    median_len = int(statistics.median(lengths)) if lengths else 0
    p90 = quantile(lengths, 0.9)
    short_rate = rate(sum(1 for n in lengths if n <= 40), len(lengths))
    long_rate = rate(sum(1 for n in lengths if n > 200), len(lengths))
    multiline_rate = rate(sum(1 for n in line_counts if n > 1), len(texts))

    brief = []
    brief.append(f"AVERAGE REPLY LENGTH: {mean_len} characters (median {median_len}, 90th percentile {p90}).")
    if short_rate >= 0.5:
        brief.append(
            f"{int(short_rate * 100)}% of your real replies were 40 characters or less — "
            "default to one short line, not a paragraph."
        )
    if long_rate >= 0.2:
        brief.append(f"{int(long_rate * 100)}% ran past 200 characters, so longer answers are in character when the topic needs it.")
    if multiline_rate >= 0.2:
        brief.append("You often split a thought across two lines; a line break mid-reply is natural for you.")
    if ends_none and rate(ends_none, len(texts)) >= 0.4:
        brief.append(
            f"{int(rate(ends_none, len(texts)) * 100)}% of your messages ended with no full stop at all — "
            "do not punctuate every sentence like an essay."
        )
    if rate(ends_question, len(texts)) >= 0.25:
        brief.append("You frequently end on a question, turning the reply back to the other person.")
    if rate(lowercase_start, len(texts)) >= 0.2:
        brief.append("You usually start with a lowercase letter when typing casually.")
    if rate(msgs_with_emoji, len(texts)) == 0:
        brief.append("You almost never use emoji — send none unless the other person sets the tone first.")
    elif rate(msgs_with_emoji, len(texts)) > 0.5:
        brief.append("Emoji are common in your messages; one or two is normal, never a wall of them.")
    if contractions_used:
        top_contr = ", ".join(w for w, _ in contractions_used.most_common(5))
        brief.append(f"Contractions are natural for you: {top_contr}.")
    if naija:
        brief.append(
            "Local register markers that belong in your voice: "
            + ", ".join(naija[:8])
            + ". Use them the way the person you are replying to does — never force them."
        )
    else:
        brief.append("You write plain, standard English — do not perform slang you would not normally use.")

    brief.append(
        "Never open with a courtesy preamble ('Certainly!', 'Great question', 'I'd be happy to help'). "
        "Never close with an offer of further assistance ('Let me know if you need anything else')."
    )
    brief.append("Never use markdown headings, numbered lists, or bullet essays in a chat reply.")

    profile_data = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": {
            "turns": len(turns),
            "my_turns": len(mine),
            "chats": len({t["chat"] for t in turns}),
        },
        "length": {
            "mean": mean_len,
            "median": median_len,
            "p90": p90,
            "max": max(lengths) if lengths else 0,
            "short_rate": short_rate,
            "long_rate": long_rate,
        },
        "lines": {
            "mean": round(statistics.mean(line_counts), 2) if line_counts else 0,
            "multi_line_rate": multiline_rate,
        },
        "emoji": {
            "messages_with_emoji_rate": rate(msgs_with_emoji, len(texts)),
            "top": [{"emoji": e, "count": c} for e, c in emoji_counter.most_common(8)],
        },
        "punctuation": {
            "ends_period_rate": rate(ends_period, len(texts)),
            "ends_question_rate": rate(ends_question, len(texts)),
            "ends_exclamation_rate": rate(ends_bang, len(texts)),
            "ends_unpunctuated_rate": rate(ends_none, len(texts)),
            "ellipsis_rate": rate(ellipsis, len(texts)),
            "lowercase_start_rate": rate(lowercase_start, len(texts)),
            "allcaps_word_rate": rate(allcaps, len(texts)),
        },
        "contractions": [{"word": w, "count": c} for w, c in contractions_used.most_common(10)],
        "openers": [{"text": t, "count": c} for t, c in openers.most_common(10)],
        "closers": [{"text": t, "count": c} for t, c in closers.most_common(10)],
        "signature_words": [{"word": w, "count": c} for w, c in words.most_common(20)],
        "naija_markers": naija[:10],
        "voice_brief": "\n".join(f"- {line}" for line in brief),
    }

    examples = build_fewshot(turns, fewshot_limit)
    fewshot_data = {
        "generated_at": profile_data["generated_at"],
        "count": len(examples),
        "examples": examples,
    }
    return profile_data, fewshot_data


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Build a voice profile from parsed WhatsApp turns.")
    ap.add_argument("--input", default="src/data/parsed_chat.jsonl",
                    help="One or more JSONL files (space separated). --inputs is an alias.")
    ap.add_argument("--inputs", nargs="+", default=None,
                    help="Merge several JSONL files into one corpus.")
    ap.add_argument("--out-dir", default="src/data")
    ap.add_argument("--fewshot", type=int, default=12, help="How many real exchanges to keep as exemplars.")
    args = ap.parse_args(argv)

    requested = args.inputs if args.inputs else [args.input]
    in_paths = [Path(os.path.expandvars(os.path.expanduser(p))) for p in requested]
    missing = [p for p in in_paths if not p.exists()]
    if missing:
        for p in missing:
            print(f"Input not found: {p}", file=sys.stderr)
        return 1

    out_dir = Path(os.path.expandvars(os.path.expanduser(args.out_dir)))

    turns = []
    for in_path in in_paths:
        with in_path.open("r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    turns.append(json.loads(line))

    if not turns:
        print("No turns parsed from the supplied files.", file=sys.stderr)
        return 1

    prof, fewshot = profile(turns, args.fewshot)
    engagement = build_engagement(turns)

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "style_profile.json").write_text(
        json.dumps(prof, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "fewshot.json").write_text(
        json.dumps(fewshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "engagement_profile.json").write_text(
        json.dumps(engagement, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(f"Corpus: {len(turns)} turns from {len(in_paths)} file(s).")
    print(f"Profiled {prof['source']['my_turns']} of your messages across {prof['source']['chats']} chat(s).")
    print(f"Median reply length: {prof['length']['median']} chars | emoji/msg: {prof['emoji']['messages_with_emoji_rate']}")
    print(f"Participation: {engagement['participation']['overall']} of the conversation")
    print(f"Answers questions: {engagement['response']['question_rate']} of the time")
    print(f"Exemplars kept: {fewshot['count']}")
    print(f"-> {out_dir / 'style_profile.json'}")
    print(f"-> {out_dir / 'fewshot.json'}")
    print(f"-> {out_dir / 'engagement_profile.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
