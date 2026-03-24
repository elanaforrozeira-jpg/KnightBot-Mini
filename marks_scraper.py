#!/usr/bin/env python3
"""
Marks App Question Scraper
web.getmarks.app -> quiz_data.json
Made for KnightBot-Mini | by Ruhvaan
"""

import requests
import json
import time
import re
import random
from bs4 import BeautifulSoup

# ─────────────────────────────────────────
# CONFIG — SIRF YE SECTION BHARO
# ─────────────────────────────────────────
TOKEN = "APNA_BEARER_TOKEN_YAHAN_PASTE_KARO"  # <- browser se copy karo

EXAM_ID   = "6995da5e576cd1ce1a19b560"
MODULE_ID = "6996c063c905dafe76ae1720"

SUBJECTS = {
    "Chemistry": "6996c064c905dafe76ae1723",
    "Maths":     "6996c065c905dafe76ae173d",
    "Physics":   "6996c067c905dafe76ae175a",
}

LIMIT        = 20       # ek baar mein kitne questions (max 50 try kar sakte ho)
DELAY_MIN    = 1.5     # seconds (min delay between requests)
DELAY_MAX    = 3.5     # seconds (max delay)
BIG_BREAK_AFTER = 50   # har 50 questions ke baad bada break
BIG_BREAK_TIME  = (25, 45)  # 25-45 sec random break
OUTPUT_FILE  = "quiz_data.json"

BASE = "https://web.getmarks.app/api/v4/marks-selected"

# ─────────────────────────────────────────
# SESSION SETUP (human-like)
# ─────────────────────────────────────────
session = requests.Session()
session.headers.update({
    "Authorization":  f"Bearer {TOKEN}",
    "Accept":         "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type":   "application/json",
    "Origin":         "https://web.getmarks.app",
    "Referer":        "https://web.getmarks.app/",
    "User-Agent":     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "sec-ch-ua":      '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
})

# ─────────────────────────────────────────
# TEXT CLEANER (HTML + LaTeX)
# ─────────────────────────────────────────
LATEX_MAP = [
    (r'\\frac\{([^}]+)\}\{([^}]+)\}', r'(\1/\2)'),
    (r'\\sqrt\{([^}]+)\}',            r'sqrt(\1)'),
    (r'\\sqrt',   r'sqrt'),
    (r'\\times',  r'×'),
    (r'\\div',    r'÷'),
    (r'\\pm',     r'±'),
    (r'\\alpha',  r'α'),
    (r'\\beta',   r'β'),
    (r'\\gamma',  r'γ'),
    (r'\\Delta',  r'Δ'),
    (r'\\delta',  r'δ'),
    (r'\\theta',  r'θ'),
    (r'\\lambda', r'λ'),
    (r'\\mu',     r'μ'),
    (r'\\pi',     r'π'),
    (r'\\sigma',  r'σ'),
    (r'\\omega',  r'ω'),
    (r'\\infty',  r'∞'),
    (r'\\leq',    r'≤'),
    (r'\\geq',    r'≥'),
    (r'\\neq',    r'≠'),
    (r'\\approx', r'≈'),
    (r'\\rightarrow', r'→'),
    (r'\\leftarrow',  r'←'),
    (r'\\cdot',   r'·'),
    (r'\\\\',    r' '),
    (r'\$',       r''),
]

def clean_text(raw):
    if not raw:
        return ""
    # HTML tags hataao
    soup = BeautifulSoup(str(raw), "html.parser")
    text = soup.get_text(separator=" ")
    # LaTeX clean
    for pattern, replacement in LATEX_MAP:
        text = re.sub(pattern, replacement, text)
    # leftover \commands
    text = re.sub(r'\\[a-zA-Z]+', '', text)
    # extra spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# ─────────────────────────────────────────
# FETCH CHAPTERS FOR A SUBJECT
# ─────────────────────────────────────────
def fetch_chapters(subject_name, subject_id):
    url = f"{BASE}/exam/{EXAM_ID}/modules/{MODULE_ID}/subjects/chapters"
    params = {
        "platform":  "web",
        "subjectId": subject_id,
    }
    try:
        r = session.get(url, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()
        # chapters array find karo
        chapters = (
            data.get("chapters") or
            data.get("data") or
            data.get("results") or
            (data if isinstance(data, list) else [])
        )
        print(f"  📚 {subject_name}: {len(chapters)} chapters mila")
        return chapters
    except Exception as e:
        print(f"  ❌ Chapters fetch failed ({subject_name}): {e}")
        return []

# ─────────────────────────────────────────
# FETCH QUESTIONS FOR ONE CHAPTER (paginated)
# ─────────────────────────────────────────
def fetch_chapter_questions(chapter_id, chapter_name, subject_short):
    questions = []
    offset = 0
    page = 1
    total_fetched = 0

    while True:
        url = f"{BASE}/exam/{EXAM_ID}/modules/{MODULE_ID}/chapters/{chapter_id}/questions/all"
        params = {"limit": LIMIT, "offset": offset}

        try:
            r = session.get(url, params=params, timeout=20)
            if r.status_code == 429:
                wait = random.randint(60, 120)
                print(f"\n  ⚠️ Rate limit! {wait}s ruk raha hoon...")
                time.sleep(wait)
                continue
            r.raise_for_status()
            data = r.json()
        except Exception as e:
            print(f"\n  ❌ Page {page} failed: {e}")
            break

        # Items extract karo
        items = (
            data.get("questions") or
            data.get("data") or
            data.get("results") or
            (data if isinstance(data, list) else [])
        )
        total_available = (
            data.get("total") or
            data.get("totalCount") or
            data.get("count") or 0
        )

        if not items:
            break

        for item in items:
            parsed = parse_question(item, chapter_name, subject_short)
            if parsed:
                questions.append(parsed)
                total_fetched += 1

                # Har 50 questions ke baad bada break (anti-ban)
                if total_fetched % BIG_BREAK_AFTER == 0:
                    wait = random.randint(*BIG_BREAK_TIME)
                    print(f"\n  😴 {BIG_BREAK_AFTER} questions ho gaye — {wait}s ka break...")
                    time.sleep(wait)

        print(f"    Page {page} | +{len(items)} | Total: {len(questions)}", end="\r")

        offset += LIMIT
        page   += 1

        # End check
        if total_available and offset >= total_available:
            break
        if len(items) < LIMIT:
            break  # last page

        # Human-like random delay
        time.sleep(random.uniform(DELAY_MIN, DELAY_MAX))

    return questions

# ─────────────────────────────────────────
# PARSE ONE QUESTION
# ─────────────────────────────────────────
def parse_question(item, chapter_name, subject_short):
    # Question text + image
    q_obj  = item.get("question") or item.get("title") or {}
    q_text = clean_text(q_obj.get("text") or q_obj.get("content") or "")
    q_img  = q_obj.get("image") or None

    if not q_text:
        return None

    # Options — isCorrect: true se answer detect karo
    raw_opts = item.get("options") or []
    options  = []
    ans_idx  = 0

    for i, opt in enumerate(raw_opts):
        if isinstance(opt, dict):
            opt_text = clean_text(opt.get("text") or opt.get("value") or "")
            opt_img  = opt.get("image") or None
            # image hai toh note karo
            if not opt_text and opt_img:
                opt_text = f"[Image option {i+1}]"
            if opt.get("isCorrect") is True:
                ans_idx = i
        else:
            opt_text = clean_text(str(opt))
        if opt_text:
            options.append(opt_text)

    if len(options) < 2:
        return None

    # Explanation
    exp_obj = item.get("explanation") or item.get("solution") or {}
    if isinstance(exp_obj, dict):
        explanation = clean_text(exp_obj.get("text") or exp_obj.get("content") or "")
    else:
        explanation = clean_text(str(exp_obj))

    # Question type
    q_type = item.get("questionType") or "singleCorrect"

    # PYQ year
    prev_year = ""
    if item.get("previousYear"):
        try:
            prev_year = item["previousYear"][:4]  # "2025-04-07..." -> "2025"
        except:
            pass

    return {
        "q":           q_text,
        "q_image":     q_img,
        "options":     options[:4],
        "ans":         min(ans_idx, len(options)-1),
        "explanation": explanation,
        "subject":     subject_short,
        "category":    chapter_name,
        "type":        q_type,
        "year":        prev_year,
    }

# ─────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────
def main():
    all_questions = []

    print("🚀 Marks App Scraper shuru!")
    print(f"📌 Exam: {EXAM_ID}")
    print(f"📌 Module: {MODULE_ID}\n")

    subject_map = {"Chemistry": "C", "Maths": "M", "Physics": "P"}

    for subj_name, subj_id in SUBJECTS.items():
        print(f"\n{'='*50}")
        print(f"📖 Subject: {subj_name}")
        print(f"{'='*50}")

        chapters = fetch_chapters(subj_name, subj_id)
        subj_short = subject_map.get(subj_name, "P")

        for ch in chapters:
            ch_id   = ch.get("_id") or ch.get("id") or ""
            ch_name = ch.get("title") or ch.get("name") or ch.get("chapterName") or "Unknown"

            if not ch_id:
                continue

            print(f"\n  📝 Chapter: {ch_name}")
            qs = fetch_chapter_questions(ch_id, ch_name, subj_short)
            print(f"  ✅ {len(qs)} questions scraped from {ch_name}")
            all_questions.extend(qs)

            # Chapter ke beech bhi random delay
            time.sleep(random.uniform(2, 5))

    # Save
    output = {
        "meta": {
            "source":  "web.getmarks.app",
            "total":   len(all_questions),
            "subjects": {
                "P": sum(1 for q in all_questions if q["subject"] == "P"),
                "C": sum(1 for q in all_questions if q["subject"] == "C"),
                "M": sum(1 for q in all_questions if q["subject"] == "M"),
            }
        },
        "questions": all_questions
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*50}")
    print(f"✅ Done! {len(all_questions)} questions saved to {OUTPUT_FILE}")
    print(f"📊 Physics: {output['meta']['subjects']['P']}")
    print(f"📊 Chemistry: {output['meta']['subjects']['C']}")
    print(f"📊 Maths: {output['meta']['subjects']['M']}")
    print(f"{'='*50}")

if __name__ == "__main__":
    main()
