import json
import re
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "mock-pdfs" / "mock-question-bank.json"
MAX_FILE_MB = 18
MAX_PAGES_PER_PDF = 35
MAX_QUESTIONS_PER_PDF = 120

PDFS = [
    r"C:\Users\aloks\Downloads\Telegram Desktop\SSC_MTS_2025___Best_115_Questions_🔥___36_Shifts_का_निचोड़___Gagan.pdf",
    r"C:\Users\aloks\Downloads\Telegram Desktop\RRB_Paramedical_2025_Maths___Best_36_Questions_🔥_Railway_Latest.pdf",
    r"C:\Users\aloks\Downloads\Telegram Desktop\RRB_Technician_2025_Grade_3_Maths_Top_100_Questions___Railway_का.pdf",
    r"C:\Users\aloks\Downloads\Telegram Desktop\RRB_ALP_2025_Maths_Top_118_Questions___All_11_Shifts_निचोड़___Gagan.pdf",
    r"C:\Users\aloks\Downloads\Telegram Desktop\RRB_NTPC_2026_Graduate_Level_🔥_Top_300_Questions_पूरे_24_Shifts.pdf",
    r"C:\Users\aloks\Downloads\Telegram Desktop\RRB_Technician_Grade_3_Maths_2025___All_225_Questions_from_9_Shifts.pdf",
    r"C:\Users\aloks\Downloads\Telegram Desktop\RRB_Technician_Grade_3_Reasoning_2025___All_225_Questions_from_9.pdf",
    r"C:\Users\aloks\Downloads\Telegram Desktop\RRB_Technician_Grade_3_Science_&_General_Awareness_2025___450_Questions.pdf",
    r"C:\Users\aloks\Downloads\Telegram Desktop\RRB_NTPC_2025_Graduate_Level_Maths_Complete_PYQ_Book_Chapterwise.pdf",
    r"C:\Users\aloks\Downloads\Telegram Desktop\RRB_NTPC_2025_Graduate_Level_Reasoning_Complete_PYQ_Book_Chapterwise.pdf",
    r"C:\Users\aloks\Downloads\Telegram Desktop\RRB_NTPC_2025_Graduate_Level_General_Awareness_Complete_PYQ_Book.pdf",
    r"C:\Users\aloks\Downloads\Telegram Desktop\UP CONSTABLE 2025 08, 09, 10 JUNE 2026 All Shift questions.pdf",
]


def clean_text(value):
    return re.sub(r"\s+", " ", value or "").strip()


def category_from_name(name):
    lowered = name.lower()
    if "ntpc" in lowered:
        return "RRB NTPC"
    if "technician" in lowered:
        return "RRB Technician"
    if "alp" in lowered:
        return "RRB ALP"
    if "mts" in lowered:
        return "SSC MTS"
    if "up constable" in lowered:
        return "UP Police"
    if "paramedical" in lowered:
        return "RRB Paramedical"
    return "Railway"


def subject_from_name(name):
    lowered = name.lower()
    if "math" in lowered:
        return "Maths"
    if "reasoning" in lowered:
        return "Reasoning"
    if "general_awareness" in lowered or "general awareness" in lowered:
        return "General Awareness"
    if "science" in lowered:
        return "General Science"
    if "english" in lowered or "dictionary" in lowered:
        return "English"
    if "economics" in lowered:
        return "Economics"
    if "answerkey" in lowered or "answer_key" in lowered or "answer key" in lowered:
        return "Previous Year Mixed"
    return "Mixed Practice"


def parse_options(block):
    patterns = [
        r"\[A\]\s*(.*?)\s*\[B\]\s*(.*?)\s*\[C\]\s*(.*?)\s*\[D\]\s*(.*)",
        r"\(a\)\s*(.*?)\s*\(b\)\s*(.*?)\s*\(c\)\s*(.*?)\s*\(d\)\s*(.*)",
        r"\(A\)\s*(.*?)\s*\(B\)\s*(.*?)\s*\(C\)\s*(.*?)\s*\(D\)\s*(.*)",
    ]
    for pattern in patterns:
        match = re.search(pattern, block, flags=re.I | re.S)
        if match:
            options = [clean_text(part) for part in match.groups()]
            options[-1] = re.split(r"\s+\d{1,3}\.\s+", options[-1])[0].strip()
            return options
    return []


def parse_questions(path, subject):
    reader = PdfReader(str(path))
    text = "\n".join(page.extract_text() or "" for page in reader.pages[:MAX_PAGES_PER_PDF])
    text = text.replace("Watch Video Solutions", " ").replace("Watch Video solutions", " ")
    blocks = re.split(r"(?m)(?=\b\d{1,3}\.\s+)", text)
    questions = []
    for block in blocks:
        block = clean_text(block)
        if not re.match(r"^\d{1,3}\.\s+", block):
            continue
        options = parse_options(block)
        if len(options) != 4:
            continue
        question_text = re.split(r"\s*(?:\[A\]|\(a\)|\(A\))\s*", block, maxsplit=1)[0]
        question_text = re.sub(r"^\d{1,3}\.\s+", "", question_text).strip()
        question_text = re.sub(r"https?://\S+", "", question_text).strip()
        if len(question_text) < 20:
            continue
        questions.append(
            {
                "id": f"{path.stem.lower()[:28]}-{len(questions) + 1}",
                "section": subject,
                "question": question_text,
                "options": options,
                "answer": None,
                "explanation": "Answer key will be updated after expert review.",
            }
        )
        if len(questions) >= MAX_QUESTIONS_PER_PDF:
            break
    return questions


def main():
    tests = []
    for raw in PDFS:
        path = Path(raw)
        if not path.exists():
            continue
        if path.stat().st_size > MAX_FILE_MB * 1024 * 1024:
            continue
        subject = subject_from_name(path.name)
        questions = parse_questions(path, subject)
        if not questions:
            continue
        tests.append(
            {
                "id": re.sub(r"[^a-z0-9]+", "-", path.stem.lower()).strip("-")[:80],
                "title": path.stem,
                "category": category_from_name(path.name),
                "subject": subject,
                "language": "Hindi + English",
                "questions": questions,
            }
        )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(tests, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"tests": len(tests), "questions": sum(len(t["questions"]) for t in tests)}, indent=2))


if __name__ == "__main__":
    main()
